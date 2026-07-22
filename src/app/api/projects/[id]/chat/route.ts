import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/backend/prisma";
import { getSessionUserId } from "@/backend/session";
import { resolveGeminiKey, consumeTrialGeneration } from "@/ai/providers";
import { runAssistantTurn, appendScriptBatch } from "@/ai/chatTurn";

const chatRequestSchema = z.object({
  message: z.string().min(1),
  // Style-reference photos — analyzed for this turn only (see
  // src/lib/gemini.ts), not persisted; ChatMessage only stores text.
  images: z
    .array(z.object({ base64: z.string(), mimeType: z.string() }))
    .optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id: projectId } = await params;
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: { scenes: { orderBy: { order: "asc" } } },
  });
  if (!project) return new NextResponse("Not found", { status: 404 });

  // Chat runs on the user's own Gemini key, or — while they still have
  // trial generations left — a platform-funded key (see resolveGeminiKey in
  // src/lib/providers.ts). Fail fast with a clear message if neither is
  // available, rather than letting the request blow up further down.
  let apiKey: string;
  let usedTrial: boolean;
  try {
    ({ apiKey, usedTrial } = await resolveGeminiKey(userId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { message, images } = chatRequestSchema.parse(await request.json());

  await prisma.chatMessage.create({
    data: {
      projectId,
      role: "USER",
      // Images aren't persisted (ChatMessage is text-only), so the fact
      // that reference photos were attached is noted in the text itself —
      // otherwise re-reading this message later wouldn't explain why the
      // assistant's reply talks about photos that no longer show up anywhere.
      content: images?.length
        ? `${message}\n\n[Attached ${images.length} reference image${images.length === 1 ? "" : "s"} for style analysis]`
        : message,
    },
  });

  const history = await prisma.chatMessage.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });

  let result: Awaited<ReturnType<typeof runAssistantTurn>>;
  try {
    result = await runAssistantTurn({
      apiKey,
      projectId,
      project,
      scenes: project.scenes,
      history: history.map((m, index) => ({
        role: m.role === "USER" ? ("user" as const) : ("model" as const),
        text: m.content,
        images: index === history.length - 1 ? images : undefined,
      })),
    });
  } catch (error) {
    // generateChatCompletion already throws a human-readable message (see
    // src/lib/apiErrors.ts) — pass it straight through instead of wrapping
    // it in another layer of "X request failed:" prefixing.
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 502 },
    );
  }
  // The call reached Gemini and cost us real money either way, whether or
  // not the output was usable — see the empty-response guard just below.
  if (usedTrial) await consumeTrialGeneration(userId);

  let assistantText = result.text;
  const toolUse = result.toolCall;

  // Gemini occasionally returns a candidate with no text and no function
  // call (e.g. a transient blank generation) — silently doing nothing left
  // the user's message sitting unanswered with no explanation. Treat it the
  // same as a provider failure instead.
  if (!assistantText && !toolUse) {
    return NextResponse.json(
      { error: "Gemini didn't return a reply. Try sending your message again." },
      { status: 502 },
    );
  }

  // runAssistantTurn already persisted the assistant ChatMessage (if any).

  let scenesCreated = false;

  // Gemini's function-calling turns very often come back with a tool call
  // and *no* accompanying text (confirmed repeatedly in testing — it's the
  // model's normal behavior, not a fluke). Without a fallback, a successful
  // stage transition would be invisible in the chat: the project moves
  // forward but no new bubble appears, so it looks like the assistant just
  // stopped responding. Each branch below sets a short confirmation the
  // user actually sees whenever the model didn't provide its own text.
  let fallbackText: string | null = null;

  // Stage order: Niche -> Idea -> Style -> Parameters -> Script -> Script review.
  // Idea comes right after Niche so the user lands on a specific video idea
  // before spending effort on a style passport for it.
  if (toolUse?.name === "confirm_niche") {
    const input = toolUse.input as { niche: string };
    await prisma.project.update({
      where: { id: projectId },
      data: { category: input.niche, chatStage: "IDEA" },
    });
    fallbackText = `Niche locked in: "${input.niche}". Now let's land on a specific video idea.`;
  }

  if (toolUse?.name === "confirm_topic") {
    const input = toolUse.input as { topic: string };
    await prisma.project.update({
      where: { id: projectId },
      data: { topic: input.topic, chatStage: "STYLE" },
    });
    fallbackText = `Idea locked in: "${input.topic}". Now let's build the style passport — upload up to 5 reference frames, or describe the visual style you want.`;
  }

  if (toolUse?.name === "lock_style") {
    const input = toolUse.input as {
      styleBlock: string;
      characters?: string;
      tone?: string;
    };
    await prisma.project.update({
      where: { id: projectId },
      data: {
        styleBlock: input.styleBlock,
        characters: input.characters,
        tone: input.tone,
        chatStage: "PARAMETERS",
      },
    });
    fallbackText = "Style passport locked in. Now let's set the target duration and language.";
  }

  if (toolUse?.name === "set_parameters") {
    const input = toolUse.input as { durationSeconds: number; language: string };
    await prisma.project.update({
      where: { id: projectId },
      data: {
        durationSeconds: input.durationSeconds,
        language: input.language,
        chatStage: "SCRIPT",
      },
    });
    fallbackText = `Got it — ${input.durationSeconds}s, in ${input.language}. Let's write the script.`;
  }

  if (toolUse?.name === "propose_scenes") {
    const input = toolUse.input as {
      scenes: { script: string; imagePrompt: string; durationMs?: number }[];
    };

    await prisma.$transaction([
      prisma.project.update({
        where: { id: projectId },
        data: { status: "REVIEWING_SCENES", chatStage: "SCRIPT_REVIEW" },
      }),
      prisma.scene.deleteMany({ where: { projectId } }),
      prisma.scene.createMany({
        data: input.scenes.map((scene, index) => ({
          projectId,
          order: index,
          script: scene.script,
          imagePrompt: scene.imagePrompt,
          durationMs: scene.durationMs,
        })),
      }),
    ]);
    scenesCreated = true;
    fallbackText = `Storyboard ready — ${input.scenes.length} scenes. Head to the Image tab to generate and review them.`;
  }

  // SCRIPT stage: the model writes the script in batches of up to 8 scenes
  // instead of one giant call (a long video can need far more scenes than
  // fit in a single response — see the "MAX_TOKENS" fix in gemini.ts and
  // the plan this was designed against). This loop keeps calling the model
  // server-side, appending each batch, until isFinalBatch or a safety cap —
  // the user just sees one "sending" spinner, not a "continue" button per
  // batch. SCRIPT_REVIEW keeps using the full-replace propose_scenes tool
  // above for revisions, unchanged.
  if (toolUse?.name === "propose_scene_batch") {
    const MAX_BATCH_ITERATIONS = 8;
    let batchInput = toolUse.input as {
      scenes: { script: string; imagePrompt: string; durationMs?: number }[];
      isFinalBatch: boolean;
    };
    let startOrder = project.scenes.length;

    for (let iteration = 1; ; iteration++) {
      await appendScriptBatch(projectId, batchInput.scenes, startOrder);
      startOrder += batchInput.scenes.length;

      if (batchInput.isFinalBatch) {
        await prisma.project.update({
          where: { id: projectId },
          data: { status: "REVIEWING_SCENES", chatStage: "SCRIPT_REVIEW" },
        });
        scenesCreated = true;
        fallbackText = `Storyboard ready — ${startOrder} scenes. Head to the Image tab to generate and review them.`;
        break;
      }

      if (iteration >= MAX_BATCH_ITERATIONS) {
        fallbackText = `Written ${startOrder} scenes so far — reply "continue" and I'll keep going.`;
        break;
      }

      // Re-fetch rather than track in memory: runAssistantTurn already
      // persisted this turn's real text (if any) as a ChatMessage, and the
      // model gets narrative continuity from the SCRIPT PROGRESS block
      // (scene count + duration so far), not from re-reading old messages.
      const freshProject = await prisma.project.findUniqueOrThrow({
        where: { id: projectId },
        include: { scenes: { orderBy: { order: "asc" } } },
      });
      const freshHistory = await prisma.chatMessage.findMany({
        where: { projectId },
        orderBy: { createdAt: "asc" },
      });

      let nextResult: Awaited<ReturnType<typeof runAssistantTurn>>;
      try {
        nextResult = await runAssistantTurn({
          apiKey,
          projectId,
          project: freshProject,
          scenes: freshProject.scenes,
          history: [
            ...freshHistory.map((m) => ({
              role: m.role === "USER" ? ("user" as const) : ("model" as const),
              text: m.content,
            })),
            { role: "user" as const, text: "Continue with the next batch." },
          ],
        });
      } catch (error) {
        fallbackText =
          error instanceof Error ? error.message : "Couldn't continue the script.";
        break;
      }
      if (usedTrial) await consumeTrialGeneration(userId);

      if (!nextResult.text && !nextResult.toolCall) {
        fallbackText =
          'Gemini didn\'t return a reply while continuing the script. Reply "continue" to try again.';
        break;
      }

      if (nextResult.toolCall?.name !== "propose_scene_batch") {
        assistantText = nextResult.text;
        fallbackText = nextResult.text
          ? null
          : 'Didn\'t get the next batch — reply "continue" to try again.';
        break;
      }

      batchInput = nextResult.toolCall.input as typeof batchInput;
    }
  }

  if (toolUse?.name === "propose_metadata") {
    const input = toolUse.input as {
      titles: string[];
      description: string;
      tags: string[];
      thumbnailPrompts: string[];
    };
    await prisma.$transaction([
      prisma.project.update({
        where: { id: projectId },
        data: {
          suggestedTitles: input.titles,
          description: input.description,
          tags: input.tags,
        },
      }),
      prisma.thumbnail.deleteMany({ where: { projectId } }),
      prisma.thumbnail.createMany({
        data: input.thumbnailPrompts.map((prompt, index) => ({
          projectId,
          order: index,
          prompt,
        })),
      }),
    ]);
    fallbackText = "Metadata locked in — check the Metadata tab for your titles, description, tags, and thumbnails.";
  }

  if (toolUse?.name === "confirm_voiceover_text") {
    const input = toolUse.input as {
      scenes: { sceneNumber: number; voiceoverText: string }[];
    };
    await prisma.$transaction([
      ...input.scenes.map((s) =>
        prisma.scene.updateMany({
          where: { projectId, order: s.sceneNumber - 1 },
          data: { voiceoverText: s.voiceoverText },
        }),
      ),
      prisma.project.update({
        where: { id: projectId },
        data: { chatStage: "SCRIPT_REVIEW" },
      }),
    ]);
    fallbackText = "Voiceover text locked in. Head to the VoiceOver tab to generate the narration.";
  }

  const finalAssistantText = assistantText || fallbackText;
  if (!assistantText && fallbackText) {
    await prisma.chatMessage.create({
      data: { projectId, role: "ASSISTANT", content: fallbackText },
    });
  }

  const updatedProject = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      scenes: { orderBy: { order: "asc" } },
      chatMessages: { orderBy: { createdAt: "asc" } },
      renderJobs: { orderBy: { createdAt: "desc" }, take: 1 },
      thumbnails: { orderBy: { order: "asc" } },
    },
  });

  return NextResponse.json({
    message: finalAssistantText,
    scenesCreated,
    project: updatedProject,
  });
}
