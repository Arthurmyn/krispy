import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

const createProjectSchema = z.object({
  category: z.string().min(1),
  aspectRatio: z.enum(["RATIO_9_16", "RATIO_16_9", "RATIO_1_1"]),
  platform: z.enum(["TIKTOK", "YOUTUBE_SHORTS", "INSTAGRAM_REELS"]),
  audience: z.string().trim().min(1).optional(),
});

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = createProjectSchema.parse(await request.json());
  const project = await prisma.project.create({
    data: {
      userId,
      category: body.category,
      aspectRatio: body.aspectRatio,
      platform: body.platform,
      audience: body.audience,
    },
  });
  return NextResponse.json({ project }, { status: 201 });
}
