import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { resolveGeminiKey, consumeTrialGeneration } from "@/lib/providers";
import { runAssistantTurn } from "@/lib/chatTurn";
import { MUSIC_LIBRARY } from "@/lib/musicLibrary";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, userId },
    include: {
      scenes: { orderBy: { order: "asc" } },
      chatMessages: { orderBy: { createdAt: "asc" } },
      renderJobs: { orderBy: { createdAt: "desc" }, take: 1 },
      thumbnails: { orderBy: { order: "asc" } },
    },
  });
  if (!project) return new NextResponse("Not found", { status: 404 });

  return NextResponse.json({ project });
}

const patchSchema = z.object({
  musicTrackId: z
    .string()
    .refine((id) => MUSIC_LIBRARY.some((t) => t.id === id), {
      message: "Unknown musicTrackId",
    })
    .nullable()
    .optional(),
  // The single bulk "review everything, then approve" gate before editing
  // (music/render) — set once all scenes have their image + voiceover
  // ready. See the Scenes section in ProjectWorkspace.tsx.
  approveScenes: z.literal(true).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, userId },
    include: {
      scenes: { orderBy: { order: "asc" } },
      chatMessages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!project) return new NextResponse("Not found", { status: 404 });

  const { musicTrackId, approveScenes } = patchSchema.parse(
    await request.json(),
  );

  if (approveScenes) {
    // Only images gate this approval now — voiceover text gets reviewed in
    // chat right after (see below), audio generation happens later in the
    // VoiceOver tab, so it can't be a precondition here anymore.
    const allReady =
      project.scenes.length > 0 &&
      project.scenes.every((s) => s.imageStatus === "READY");
    if (!allReady) {
      return NextResponse.json(
        { error: "Every scene needs a ready image first." },
        { status: 400 },
      );
    }
  }

  await prisma.project.update({
    where: { id },
    data: {
      ...(musicTrackId !== undefined ? { musicTrackId } : {}),
      ...(approveScenes ? { status: "READY_TO_RENDER", chatStage: "VOICEOVER_REVIEW" } : {}),
    },
  });

  // Proactively post the voiceover-review message in chat, the same way a
  // user-driven turn would — best-effort: if it fails (no key, rate limit),
  // the approval itself still stands and the user can trigger it by typing
  // in chat manually.
  let voiceoverReviewError: string | null = null;
  if (approveScenes) {
    try {
      const { apiKey, usedTrial } = await resolveGeminiKey(userId);
      const result = await runAssistantTurn({
        apiKey,
        projectId: id,
        project: { ...project, chatStage: "VOICEOVER_REVIEW" },
        scenes: project.scenes,
        history: [
          ...project.chatMessages.map((m) => ({
            role: m.role === "USER" ? ("user" as const) : ("model" as const),
            text: m.content,
          })),
          {
            role: "user" as const,
            text: "I've approved all the scene images. Please continue.",
          },
        ],
      });
      if (usedTrial) await consumeTrialGeneration(userId);
      // See the same guard in the chat route — Gemini occasionally returns
      // neither text nor a tool call. This turn never has a tool call by
      // design (it's the opening proposal, not a confirmation), so empty
      // text alone means nothing got posted to chat.
      if (!result.text) {
        voiceoverReviewError = "Gemini didn't return a reply. Open the chat and continue manually.";
      }
    } catch (error) {
      voiceoverReviewError =
        error instanceof Error ? error.message : "Couldn't start the voiceover review.";
    }
  }

  const updatedProject = await prisma.project.findUniqueOrThrow({
    where: { id },
    include: {
      scenes: { orderBy: { order: "asc" } },
      chatMessages: { orderBy: { createdAt: "asc" } },
      renderJobs: { orderBy: { createdAt: "desc" }, take: 1 },
      thumbnails: { orderBy: { order: "asc" } },
    },
  });

  return NextResponse.json({ project: updatedProject, voiceoverReviewError });
}
