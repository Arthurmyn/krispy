import path from "path";
import fs from "fs/promises";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
};

// R2 is only used when fully configured (all four vars present) — lets local
// dev keep writing to public/generated without anyone needing R2 credentials
// just to run the app. Production (Vercel's filesystem is ephemeral) always
// needs these set.
function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    return null;
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

let cachedClient: { client: S3Client; bucket: string; publicUrl: string } | null = null;

function getR2Client() {
  if (cachedClient) return cachedClient;
  const config = getR2Config();
  if (!config) return null;
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  cachedClient = { client, bucket: config.bucket, publicUrl: config.publicUrl.replace(/\/$/, "") };
  return cachedClient;
}

async function saveToR2(key: string, data: Buffer, mimeType: string): Promise<string> {
  const r2 = getR2Client();
  if (!r2) throw new Error("R2 not configured");
  await r2.client.send(
    new PutObjectCommand({
      Bucket: r2.bucket,
      Key: key,
      Body: data,
      ContentType: mimeType,
    }),
  );
  return `${r2.publicUrl}/${key}`;
}

async function saveToLocalDisk(key: string, data: Buffer): Promise<string> {
  const dir = path.join(process.cwd(), "public", "generated", path.dirname(key));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(process.cwd(), "public", "generated", key), data);
  return `/generated/${key}`;
}

// Generated assets (scene images, voiceovers) — stored in R2 when configured
// (required in production, since Vercel's filesystem is ephemeral and
// wouldn't survive between requests), falling back to public/generated for
// local dev without R2 credentials.
export async function saveGeneratedAsset(
  projectId: string,
  sceneId: string,
  kind: "image" | "voiceover",
  data: Buffer,
  mimeType: string,
): Promise<string> {
  const extension = MIME_EXTENSIONS[mimeType] ?? "bin";
  const key = `${projectId}/${sceneId}-${kind}-${Date.now()}.${extension}`;

  if (getR2Config()) {
    return saveToR2(key, data, mimeType);
  }
  return saveToLocalDisk(key, data);
}

// Final rendered MP4s — same R2-or-local split, called by the render worker
// after Remotion finishes writing the file to local disk.
export async function saveRenderOutput(renderJobId: string, filePath: string): Promise<string> {
  const data = await fs.readFile(filePath);
  const key = `renders/${renderJobId}.mp4`;

  if (getR2Config()) {
    return saveToR2(key, data, "video/mp4");
  }
  return saveToLocalDisk(key, data);
}
