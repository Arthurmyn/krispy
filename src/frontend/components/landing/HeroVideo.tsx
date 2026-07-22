"use client";

import { useEffect, useRef } from "react";

const FADE_MS = 500;
const FADE_OUT_LEAD = 0.55;

// Loops the hero background video with a soft cross-fade at the seam
// instead of a hard cut, so the loop point isn't visually jarring.
export function HeroVideo({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const fadingOutRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const cancelFade = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const fadeTo = (target: number, onComplete?: () => void) => {
      cancelFade();
      const start = performance.now();
      const startOpacity = video.style.opacity
        ? parseFloat(video.style.opacity)
        : target === 1
          ? 0
          : 1;

      const step = (now: number) => {
        const elapsed = now - start;
        const t = Math.min(elapsed / FADE_MS, 1);
        video.style.opacity = String(startOpacity + (target - startOpacity) * t);
        if (t < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          rafRef.current = null;
          onComplete?.();
        }
      };

      rafRef.current = requestAnimationFrame(step);
    };

    const handleTimeUpdate = () => {
      if (fadingOutRef.current) return;
      if (!video.duration) return;
      const remaining = video.duration - video.currentTime;
      if (remaining <= FADE_OUT_LEAD) {
        fadingOutRef.current = true;
        fadeTo(0);
      }
    };

    const handleEnded = () => {
      video.style.opacity = "0";
      setTimeout(() => {
        video.currentTime = 0;
        video.play();
        fadingOutRef.current = false;
        fadeTo(1);
      }, 100);
    };

    const handlePlay = () => {
      fadeTo(1);
    };

    video.style.opacity = "0";
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("play", handlePlay);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("play", handlePlay);
      cancelFade();
    };
  }, []);

  return (
    <video
      ref={videoRef}
      className="absolute inset-0 h-full w-full object-cover"
      src={src}
      autoPlay
      muted
      loop={false}
      playsInline
    />
  );
}
