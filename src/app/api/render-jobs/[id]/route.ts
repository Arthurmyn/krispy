import { NextResponse } from "next/server";
import { prisma } from "@/backend/prisma";
import { getSessionUserId } from "@/backend/session";

// Polled by the client while a render is in progress.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const renderJob = await prisma.renderJob.findFirst({
    where: { id, project: { userId } },
  });
  if (!renderJob) return new NextResponse("Not found", { status: 404 });

  return NextResponse.json({ renderJob });
}
