import path from "path";
import fs from "fs/promises";

const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
};

// Dev-only local storage: writes generated assets under public/generated so
// Next.js serves them directly. Swap for S3/R2 + signed URLs in production.
export async function saveGeneratedAsset(
  projectId: string,
  sceneId: string,
  kind: "image" | "voiceover",
  data: Buffer,
  mimeType: string,
): Promise<string> {
  const extension = MIME_EXTENSIONS[mimeType] ?? "bin";
  const dir = path.join(process.cwd(), "public", "generated", projectId);
  await fs.mkdir(dir, { recursive: true });

  const filename = `${sceneId}-${kind}-${Date.now()}.${extension}`;
  await fs.writeFile(path.join(dir, filename), data);

  return `/generated/${projectId}/${filename}`;
}
