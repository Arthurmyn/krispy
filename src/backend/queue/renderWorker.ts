import "dotenv/config";
import path from "path";
import fs from "fs/promises";
import { Worker } from "bullmq";
import { prisma } from "@/backend/prisma";
import { renderShortVideo } from "@/backend/remotion/render";
import { FPS, type ShortVideoProps } from "@/backend/remotion/types";
import { findMusicTrack } from "@/backend/musicLibrary";
import type { AspectRatio, Scene } from "@/generated/prisma/client";
import { RENDER_QUEUE_NAME, type RenderJobData } from "./renderQueue";

// Runs as a separate process (`npm run worker`) so long-running Remotion
// renders never block the Next.js request/response cycle.
const ASPECT_RATIO_MAP: Record<AspectRatio, "9:16" | "16:9" | "1:1"> = {
  RATIO_9_16: "9:16",
  RATIO_16_9: "16:9",
  RATIO_1_1: "1:1",
};

async function processRenderJob(data: RenderJobData): Promise<void> {
  const { renderJobId, projectId } = data;

  await prisma.renderJob.update({
    where: { id: renderJobId },
    data: { status: "RENDERING" },
  });

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { scenes: { orderBy: { order: "asc" } } },
  });

  const props: ShortVideoProps = {
    aspectRatio: ASPECT_RATIO_MAP[project.aspectRatio],
    fps: FPS,
    musicUrl: findMusicTrack(project.musicTrackId)?.url ?? null,
    scenes: project.scenes.map((scene: Scene) => {
      if (!scene.imageUrl) {
        throw new Error(`Scene ${scene.id} has no generated image yet`);
      }
      return {
        id: scene.id,
        imageUrl: scene.imageUrl,
        voiceoverUrl: scene.voiceoverUrl,
        durationMs: scene.durationMs ?? 3000,
        subtitle: scene.script,
      };
    }),
  };

  const outputDir = process.env.RENDER_OUTPUT_DIR ?? "./renders";
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${renderJobId}.mp4`);

  await renderShortVideo(props, outputPath);

  await prisma.renderJob.update({
    where: { id: renderJobId },
    data: { status: "COMPLETE", outputUrl: outputPath },
  });

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "COMPLETE" },
  });
}

const worker = new Worker<RenderJobData>(
  RENDER_QUEUE_NAME,
  async (job) => processRenderJob(job.data),
  {
    connection: { url: process.env.REDIS_URL ?? "redis://localhost:6379" },
    concurrency: 1,
  },
);

worker.on("failed", async (job, error) => {
  if (!job) return;
  await prisma.renderJob.update({
    where: { id: job.data.renderJobId },
    data: { status: "FAILED", error: error.message },
  });
});

worker.on("completed", (job) => {
  console.log(`Render job ${job.data.renderJobId} complete`);
});

console.log("Render worker started, waiting for jobs...");
