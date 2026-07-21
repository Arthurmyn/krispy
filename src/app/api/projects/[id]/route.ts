import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
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
    include: { scenes: true },
  });
  if (!project) return new NextResponse("Not found", { status: 404 });

  const { musicTrackId, approveScenes } = patchSchema.parse(
    await request.json(),
  );

  if (approveScenes) {
    const allReady =
      project.scenes.length > 0 &&
      project.scenes.every(
        (s) => s.imageStatus === "READY" && s.voiceoverStatus === "READY",
      );
    if (!allReady) {
      return NextResponse.json(
        { error: "Every scene needs a ready image and voiceover first." },
        { status: 400 },
      );
    }
  }

  const updated = await prisma.project.update({
    where: { id },
    data: {
      ...(musicTrackId !== undefined ? { musicTrackId } : {}),
      ...(approveScenes ? { status: "READY_TO_RENDER" } : {}),
    },
  });

  return NextResponse.json({ project: updated });
}
