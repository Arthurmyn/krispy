import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { generateSceneImage, consumeTrialGeneration } from "@/lib/providers";
import { saveGeneratedAsset } from "@/lib/assets";
import type { AspectRatio } from "@/generated/prisma/client";

const ASPECT_RATIO_MAP: Record<AspectRatio, "9:16" | "16:9" | "1:1"> = {
  RATIO_9_16: "9:16",
  RATIO_16_9: "16:9",
  RATIO_1_1: "1:1",
};

// Regenerating an individual scene's image with an edited prompt is the
// "edit/regenerate any single one" step in the review flow. Dropping a
// reference image turns the same request into an image edit instead of a
// from-scratch generation — see src/lib/providers.ts.
const bodySchema = z.object({
  prompt: z.string().min(1).optional(),
  referenceImageBase64: z.string().optional(),
  referenceImageMimeType: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id: sceneId } = await params;
  const scene = await prisma.scene.findFirst({
    where: { id: sceneId, project: { userId } },
    include: { project: true },
  });
  if (!scene) return new NextResponse("Not found", { status: 404 });

  const { prompt, referenceImageBase64, referenceImageMimeType } =
    bodySchema.parse(await request.json().catch(() => ({})));
  const imagePrompt = prompt ?? scene.imagePrompt;
  if (!imagePrompt) {
    return NextResponse.json(
      { error: "Scene has no image prompt" },
      { status: 400 },
    );
  }

  await prisma.scene.update({
    where: { id: sceneId },
    data: { imageStatus: "GENERATING", imagePrompt },
  });

  try {
    const { imageBase64, mimeType, usedTrial } = await generateSceneImage(
      userId,
      imagePrompt,
      ASPECT_RATIO_MAP[scene.project.aspectRatio],
      referenceImageBase64 && referenceImageMimeType
        ? { base64: referenceImageBase64, mimeType: referenceImageMimeType }
        : undefined,
    );
    if (usedTrial) await consumeTrialGeneration(userId);
    const imageUrl = await saveGeneratedAsset(
      scene.project.id,
      sceneId,
      "image",
      Buffer.from(imageBase64, "base64"),
      mimeType,
    );

    const updated = await prisma.scene.update({
      where: { id: sceneId },
      data: { imageUrl, imageStatus: "READY" },
    });
    return NextResponse.json({ scene: updated });
  } catch (error) {
    await prisma.scene.update({
      where: { id: sceneId },
      data: { imageStatus: "FAILED" },
    });
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

// Deliberately deletes a scene's saved image — the trash icon in the
// full-screen editor uses this. Distinct from clearing a locally-attached
// reference image, which never touches the database.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id: sceneId } = await params;
  const scene = await prisma.scene.findFirst({
    where: { id: sceneId, project: { userId } },
  });
  if (!scene) return new NextResponse("Not found", { status: 404 });

  const updated = await prisma.scene.update({
    where: { id: sceneId },
    data: { imageUrl: null, imageStatus: "PENDING" },
  });
  return NextResponse.json({ scene: updated });
}
