import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { generateVoiceover, consumeTrialGeneration } from "@/lib/providers";
import { saveGeneratedAsset } from "@/lib/assets";

const bodySchema = z.object({
  text: z.string().min(1).optional(),
  provider: z.enum(["GEMINI", "ELEVENLABS"]).optional(),
  voiceId: z.string().optional(),
  // ElevenLabs-only voice_settings — ignored by the Gemini path.
  elevenLabsSettings: z
    .object({
      stability: z.number().min(0).max(1).optional(),
      similarityBoost: z.number().min(0).max(1).optional(),
      style: z.number().min(0).max(1).optional(),
      useSpeakerBoost: z.boolean().optional(),
    })
    .optional(),
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

  const { text, provider, voiceId, elevenLabsSettings } = bodySchema.parse(
    await request.json().catch(() => ({})),
  );
  const voiceoverText = text ?? scene.voiceoverText ?? scene.script;

  await prisma.scene.update({
    where: { id: sceneId },
    data: { voiceoverStatus: "GENERATING", voiceoverText },
  });

  try {
    const { audioBase64, mimeType, usedTrial } = await generateVoiceover(
      userId,
      voiceoverText,
      { provider, voiceId, elevenLabsSettings },
    );
    if (usedTrial) await consumeTrialGeneration(userId);
    const voiceoverUrl = await saveGeneratedAsset(
      scene.project.id,
      sceneId,
      "voiceover",
      Buffer.from(audioBase64, "base64"),
      mimeType,
    );

    const updated = await prisma.scene.update({
      where: { id: sceneId },
      data: { voiceoverUrl, voiceoverStatus: "READY" },
    });
    return NextResponse.json({ scene: updated });
  } catch (error) {
    await prisma.scene.update({
      where: { id: sceneId },
      data: { voiceoverStatus: "FAILED" },
    });
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
