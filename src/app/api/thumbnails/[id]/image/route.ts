import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/backend/prisma";
import { getSessionUserId } from "@/backend/session";
import { generateSceneImage, consumeTrialGeneration } from "@/ai/providers";
import { saveGeneratedAsset } from "@/backend/assets";

const bodySchema = z.object({
  prompt: z.string().min(1).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id: thumbnailId } = await params;
  const thumbnail = await prisma.thumbnail.findFirst({
    where: { id: thumbnailId, project: { userId } },
    include: { project: true },
  });
  if (!thumbnail) return new NextResponse("Not found", { status: 404 });

  const { prompt } = bodySchema.parse(await request.json().catch(() => ({})));
  const imagePrompt = prompt ?? thumbnail.prompt;

  await prisma.thumbnail.update({
    where: { id: thumbnailId },
    data: { imageStatus: "GENERATING", prompt: imagePrompt },
  });

  try {
    // YouTube thumbnails are 16:9 regardless of the video's own aspect
    // ratio (which is usually 9:16 for shorts) — this is a separate asset,
    // not a frame from the video itself.
    const { imageBase64, mimeType, usedTrial } = await generateSceneImage(
      userId,
      imagePrompt,
      "16:9",
    );
    if (usedTrial) await consumeTrialGeneration(userId);
    const imageUrl = await saveGeneratedAsset(
      thumbnail.project.id,
      thumbnailId,
      "image",
      Buffer.from(imageBase64, "base64"),
      mimeType,
    );

    const updated = await prisma.thumbnail.update({
      where: { id: thumbnailId },
      data: { imageUrl, imageStatus: "READY" },
    });
    return NextResponse.json({ thumbnail: updated });
  } catch (error) {
    await prisma.thumbnail.update({
      where: { id: thumbnailId },
      data: { imageStatus: "FAILED" },
    });
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
