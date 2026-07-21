export function msToFrames(ms: number, fps: number): number {
  return Math.max(1, Math.round((ms / 1000) * fps));
}

export function totalDurationInFrames(
  scenes: { durationMs: number }[],
  fps: number,
  transitionFrames: number,
): number {
  const sceneFrames = scenes.reduce(
    (sum, scene) => sum + msToFrames(scene.durationMs, fps),
    0,
  );
  const transitionsCount = Math.max(0, scenes.length - 1);
  return sceneFrames - transitionsCount * transitionFrames;
}
