export type SceneInput = {
  id: string;
  imageUrl: string;
  voiceoverUrl: string | null;
  durationMs: number;
  subtitle: string;
};

export type ShortVideoProps = {
  scenes: SceneInput[];
  aspectRatio: "9:16" | "16:9" | "1:1";
  fps: number;
  musicUrl: string | null;
};

export const FPS = 30;
export const TRANSITION_FRAMES = 12;

export function dimensionsForAspectRatio(
  aspectRatio: ShortVideoProps["aspectRatio"],
): { width: number; height: number } {
  switch (aspectRatio) {
    case "9:16":
      return { width: 1080, height: 1920 };
    case "16:9":
      return { width: 1920, height: 1080 };
    case "1:1":
      return { width: 1080, height: 1080 };
  }
}
