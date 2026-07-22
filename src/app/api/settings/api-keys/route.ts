import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { encryptApiKey } from "@/lib/crypto";

const bodySchema = z.object({
  provider: z.enum(["GEMINI", "ELEVENLABS", "ANTHROPIC"]),
  apiKey: z.string().min(1),
});

// BYOK key management. We only ever store these encrypted, and only ever
// use them to call the provider on the user's behalf — never to bill them
// through us.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const [keys, user] = await Promise.all([
    prisma.apiKey.findMany({
      where: { userId },
      select: { provider: true, createdAt: true },
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { trialGenerationsRemaining: true },
    }),
  ]);
  return NextResponse.json({
    keys,
    trialGenerationsRemaining: user.trialGenerationsRemaining,
  });
}

export async function PUT(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { provider, apiKey } = bodySchema.parse(await request.json());
  const encryptedKey = encryptApiKey(apiKey);

  await prisma.apiKey.upsert({
    where: { userId_provider: { userId, provider } },
    update: { encryptedKey },
    create: { userId, provider, encryptedKey },
  });

  return NextResponse.json({ ok: true });
}
