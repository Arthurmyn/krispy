import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/backend/prisma";
import { getSessionUserId } from "@/backend/session";

// Bulk reorder / re-time scenes from the Render tab's editor — doesn't
// touch script, image, or voiceover, just the assembly (order + duration).
const bodySchema = z.object({
  scenes: z
    .array(
      z.object({
        id: z.string(),
        order: z.number().int().min(0),
        durationMs: z.number().int().min(500),
      }),
    )
    .min(1),
});

export async function PATCH(
  request: NextRequest,
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

  const { scenes } = bodySchema.parse(await request.json());

  const knownIds = new Set(project.scenes.map((s) => s.id));
  if (scenes.some((s) => !knownIds.has(s.id))) {
    return NextResponse.json(
      { error: "One or more scenes don't belong to this project" },
      { status: 400 },
    );
  }

  // Order has a unique constraint per project, so a straight bulk update can
  // collide mid-transaction (e.g. swapping two scenes' orders). Push
  // everything to a disjoint negative range first, then to the final order.
  await prisma.$transaction([
    ...scenes.map((s, i) =>
      prisma.scene.update({
        where: { id: s.id },
        data: { order: -1 - i },
      }),
    ),
    ...scenes.map((s) =>
      prisma.scene.update({
        where: { id: s.id },
        data: { order: s.order, durationMs: s.durationMs },
      }),
    ),
  ]);

  const updatedScenes = await prisma.scene.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ scenes: updatedScenes });
}
