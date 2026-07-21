import { AbsoluteFill, Audio, Loop } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Scene } from "./Scene";
import { TRANSITION_FRAMES, type ShortVideoProps } from "./types";
import { msToFrames } from "./duration";

// Music bed is ducked well under the voiceover and looped to cover the full
// composition regardless of how long the source track is.
const MUSIC_VOLUME = 0.15;

// Assumed length of one catalog track, used as the Loop's iteration length.
// Loop auto-clips to the composition's actual duration either way; this
// only needs to roughly match real track lengths so loop seams land near
// natural silence. Revisit once real mp3s (with known durations) are added.
const ASSUMED_TRACK_DURATION_SEC = 30;

// Scene duration, ordering, and subtitle timing are all driven by `scenes`
// (data from the project's confirmed script/images/voiceover) rather than a
// hand-rolled ffmpeg filter graph — this is the whole point of using
// Remotion here.
export function ShortVideo({ scenes, fps, musicUrl }: ShortVideoProps) {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <TransitionSeries>
        {scenes.flatMap((scene, index) => {
          const items = [
            <TransitionSeries.Sequence
              key={scene.id}
              durationInFrames={msToFrames(scene.durationMs, fps)}
            >
              <Scene scene={scene} />
            </TransitionSeries.Sequence>,
          ];
          if (index < scenes.length - 1) {
            items.push(
              <TransitionSeries.Transition
                key={`${scene.id}-transition`}
                presentation={fade()}
                timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
              />,
            );
          }
          return items;
        })}
      </TransitionSeries>
      {musicUrl ? (
        <Loop durationInFrames={ASSUMED_TRACK_DURATION_SEC * fps}>
          <Audio src={musicUrl} volume={MUSIC_VOLUME} />
        </Loop>
      ) : null}
    </AbsoluteFill>
  );
}
