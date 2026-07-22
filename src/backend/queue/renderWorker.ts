import "dotenv/config";
import path from "path";
import fs from "fs/promises";
import { Worker } from "bullmq";
import { prisma } from "@/backend/prisma";
import { renderShortVideo } from "@/backend/remotion/render";
import { FPS, type ShortVideoProps } from "@/backend/remotion/types";
import { findMusicTrack } from "@/backend/musicLibrary";
import { saveRenderOutput } from "@/backend/assets";
import type { AspectRatio, Scene } from "@/generated/prisma/client";
import { RENDER_QUEUE_NAME, type RenderJobData } from "./renderQueue";

// Runs as a separate process (`npm run worker`) so long-running Remotion
// renders never block the Next.js request/response cycle. Typically deployed
// on its own host (Railway/Fly) rather than Vercel, which cannot run
// long-lived background processes — so any relative "/..." asset URL (e.g.
// the fixed music catalog, served from the Next app's public/ folder) has to
// be resolved against APP_URL to be reachable from here.
const ASPECT_RATIO_MAP: Record<AspectRatio, "9:16" | "16:9" | "1:1"> = {
  RATIO_9_16: "9:16",
  RATIO_16_9: "16:9",
  RATIO_1_1: "1:1",
};

function resolveAssetUrl(url: string): string {
  if (!url.startsWith("/")) return url;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return `${appUrl.replace(/\/$/, "")}${url}`;
}

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

  const musicTrackUrl = findMusicTrack(project.musicTrackId)?.url;
  const props: ShortVideoProps = {
    aspectRatio: ASPECT_RATIO_MAP[project.aspectRatio],
    fps: FPS,
    musicUrl: musicTrackUrl ? resolveAssetUrl(musicTrackUrl) : null,
    scenes: project.scenes.map((scene: Scene) => {
      if (!scene.imageUrl) {
        throw new Error(`Scene ${scene.id} has no generated image yet`);
      }
      return {
        id: scene.id,
        imageUrl: resolveAssetUrl(scene.imageUrl),
        voiceoverUrl: scene.voiceoverUrl ? resolveAssetUrl(scene.voiceoverUrl) : null,
        durationMs: scene.durationMs ?? 3000,
        subtitle: scene.script,
      };
    }),
  };

  // Scratch space — Remotion needs a real local path to write to regardless
  // of where the final file ends up. saveRenderOutput uploads it to R2 (or
  // just returns a public/generated path when R2 isn't configured).
  const outputDir = process.env.RENDER_OUTPUT_DIR ?? "./renders";
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${renderJobId}.mp4`);

  await renderShortVideo(props, outputPath);
  const outputUrl = await saveRenderOutput(renderJobId, outputPath);
  if (outputUrl.startsWith("http")) {
    // Uploaded to R2 — the local scratch copy is no longer needed.
    await fs.rm(outputPath, { force: true });
  }

  await prisma.renderJob.update({
    where: { id: renderJobId },
    data: { status: "COMPLETE", outputUrl },
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
