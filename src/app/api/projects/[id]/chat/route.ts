import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { generateChatCompletion } from "@/lib/gemini";
import { getUserProviderKey } from "@/lib/providers";
import { buildSystemPrompt, getToolsForStage } from "@/lib/prompts";

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
  });
  if (!project) return new NextResponse("Not found", { status: 404 });

  // Chat runs on the user's own Gemini key (see src/lib/gemini.ts). Fail
  // fast with a clear message if they haven't connected one yet, rather
  // than letting the request blow up further down.
  let apiKey: string;
  try {
    apiKey = await getUserProviderKey(userId, "GEMINI");
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

  let result: Awaited<ReturnType<typeof generateChatCompletion>>;
  try {
    result = await generateChatCompletion({
      apiKey,
      systemPrompt: buildSystemPrompt(project),
      tools: getToolsForStage(project.chatStage),
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

  const assistantText = result.text;
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

  if (assistantText) {
    await prisma.chatMessage.create({
      data: { projectId, role: "ASSISTANT", content: assistantText },
    });
  }

  let scenesCreated = false;

  if (toolUse?.name === "confirm_niche") {
    const input = toolUse.input as { niche: string };
    await prisma.project.update({
      where: { id: projectId },
      data: { category: input.niche, chatStage: "STYLE" },
    });
  }

  if (toolUse?.name === "lock_style") {
    const input = toolUse.input as {
      styleBlock: string;
      characters?: string;
      tone?: string;
      durationSeconds?: number;
      language?: string;
    };
    await prisma.project.update({
      where: { id: projectId },
      data: {
        styleBlock: input.styleBlock,
        characters: input.characters,
        tone: input.tone,
        durationSeconds: input.durationSeconds,
        language: input.language,
        chatStage: "IDEA",
      },
    });
  }

  if (toolUse?.name === "confirm_topic") {
    const input = toolUse.input as { topic: string };
    await prisma.project.update({
      where: { id: projectId },
      data: { topic: input.topic, chatStage: "SCRIPT" },
    });
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
  }

  const updatedProject = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      scenes: { orderBy: { order: "asc" } },
      chatMessages: { orderBy: { createdAt: "asc" } },
      renderJobs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return NextResponse.json({
    message: assistantText,
    scenesCreated,
    project: updatedProject,
  });
}
