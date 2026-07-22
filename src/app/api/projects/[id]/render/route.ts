import { NextResponse } from "next/server";
import { prisma } from "@/backend/prisma";
import type { Scene } from "@/generated/prisma/client";
import { getSessionUserId } from "@/backend/session";
import { renderQueue } from "@/backend/queue/renderQueue";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id: projectId } = await params;
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: { scenes: true },
  });
  if (!project) return new NextResponse("Not found", { status: 404 });

  const notReady = project.scenes.find(
    (s: Scene) => s.imageStatus !== "READY" || s.voiceoverStatus !== "READY",
  );
  if (!project.scenes.length || notReady) {
    return NextResponse.json(
      { error: "All scenes must have a ready image and voiceover before rendering" },
      { status: 400 },
    );
  }

  const renderJob = await prisma.renderJob.create({
    data: { projectId, status: "QUEUED" },
  });
  await prisma.project.update({
    where: { id: projectId },
    data: { status: "RENDERING" },
  });

  await renderQueue.add("render", { renderJobId: renderJob.id, projectId });

  return NextResponse.json({ renderJob }, { status: 202 });
}
