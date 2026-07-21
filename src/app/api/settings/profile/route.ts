import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

const bodySchema = z.object({ name: z.string().trim().min(1).max(80) });

export async function PATCH(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { name } = bodySchema.parse(await request.json());
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name },
  });

  return NextResponse.json({ name: user.name });
}
