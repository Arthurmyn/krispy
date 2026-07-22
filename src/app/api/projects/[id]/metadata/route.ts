import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { getUserProviderKey } from "@/lib/providers";
import { runAssistantTurn } from "@/lib/chatTurn";

// Entry point for the Metadata tab — unlike the other stages, this one
// isn't reached by finishing the previous step in sequence; the user opens
// the tab whenever they want (often well after rendering) and this fires
// the first proactive chat turn, same pattern as the voiceover-review
// auto-trigger in src/app/api/projects/[id]/route.ts.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id: projectId } = await params;
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      scenes: { orderBy: { order: "asc" } },
      chatMessages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!project) return new NextResponse("Not found", { status: 404 });

  let apiKey: string;
  try {
    apiKey = await getUserProviderKey(userId, "GEMINI");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { chatStage: "METADATA" },
  });

  try {
    await runAssistantTurn({
      apiKey,
      projectId,
      project: { ...project, chatStage: "METADATA" },
      scenes: project.scenes,
      history: [
        ...project.chatMessages.map((m) => ({
          role: m.role === "USER" ? ("user" as const) : ("model" as const),
          text: m.content,
        })),
        {
          role: "user" as const,
          text: "I'd like to prepare titles, a description, tags, and thumbnails for this video.",
        },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
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

  return NextResponse.json({ project: updatedProject });
}
