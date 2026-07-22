import { Composition } from "remotion";
import { ShortVideo } from "./ShortVideo";
import {
  FPS,
  TRANSITION_FRAMES,
  dimensionsForAspectRatio,
  type ShortVideoProps,
} from "./types";
import { totalDurationInFrames } from "./duration";

const defaultProps: ShortVideoProps = {
  aspectRatio: "9:16",
  fps: FPS,
  musicUrl: null,
  scenes: [
    {
      id: "placeholder",
      imageUrl: "https://picsum.photos/1080/1920",
      voiceoverUrl: null,
      durationMs: 3000,
      subtitle: "Your scene goes here",
    },
  ],
};

export function RemotionRoot() {
  return (
    <Composition
      id="ShortVideo"
      component={ShortVideo}
      durationInFrames={totalDurationInFrames(
        defaultProps.scenes,
        defaultProps.fps,
        TRANSITION_FRAMES,
      )}
      fps={defaultProps.fps}
      width={dimensionsForAspectRatio(defaultProps.aspectRatio).width}
      height={dimensionsForAspectRatio(defaultProps.aspectRatio).height}
      defaultProps={defaultProps}
      calculateMetadata={async ({ props }) => {
        const { width, height } = dimensionsForAspectRatio(props.aspectRatio);
        return {
          width,
          height,
          durationInFrames: totalDurationInFrames(
            props.scenes,
            props.fps,
            TRANSITION_FRAMES,
          ),
        };
      }}
    />
  );
}
