import { Queue } from "bullmq";

export const RENDER_QUEUE_NAME = "render";

export type RenderJobData = {
  renderJobId: string;
  projectId: string;
};

export const renderQueue = new Queue<RenderJobData, void, "render">(
  RENDER_QUEUE_NAME,
  {
    connection: {
      url: process.env.REDIS_URL ?? "redis://localhost:6379",
      lazyConnect: true,
    },
    defaultJobOptions: {
      attempts: 2,
      removeOnComplete: { age: 60 * 60 * 24 },
      removeOnFail: { age: 60 * 60 * 24 * 7 },
    },
  },
);
