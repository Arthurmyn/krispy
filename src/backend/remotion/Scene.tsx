import { AbsoluteFill, Audio, Img } from "remotion";
import type { SceneInput } from "./types";

export function Scene({ scene }: { scene: SceneInput }) {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Img
        src={scene.imageUrl}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      {scene.voiceoverUrl ? <Audio src={scene.voiceoverUrl} /> : null}
      {scene.subtitle ? (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            alignItems: "center",
            paddingBottom: "10%",
          }}
        >
          <div
            style={{
              maxWidth: "85%",
              fontSize: 52,
              fontWeight: 700,
              color: "white",
              textAlign: "center",
              textShadow: "0 2px 12px rgba(0,0,0,0.85)",
              lineHeight: 1.25,
            }}
          >
            {scene.subtitle}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
}
