import path from "path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { ShortVideoProps } from "./types";

export async function renderShortVideo(
  props: ShortVideoProps,
  outputPath: string,
): Promise<void> {
  const bundleLocation = await bundle({
    entryPoint: path.join(process.cwd(), "src/remotion/index.ts"),
  });

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "ShortVideo",
    inputProps: props,
  });

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outputPath,
    inputProps: props,
  });
}
