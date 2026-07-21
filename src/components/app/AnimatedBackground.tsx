import type { CSSProperties } from "react";

// Deterministic pseudo-random in [0, 1) — same output on server and client
// render passes, so star positions never mismatch during hydration (unlike
// Math.random(), which would differ between the two).
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const STAR_COUNT = 160;

const STARS = Array.from({ length: STAR_COUNT }, (_, i) => {
  const top = seededRandom(i * 12.9898 + 1) * 100;
  const left = seededRandom(i * 78.233 + 2) * 100;
  const isBright = seededRandom(i * 37.719 + 3) > 0.88;
  const size = isBright ? 2 : 1;
  const delay = seededRandom(i * 4.671 + 4) * 8;
  const duration = 2.5 + seededRandom(i * 9.123 + 5) * 4.5;
  const opacity = 0.35 + seededRandom(i * 15.61 + 6) * 0.55;
  return { top, left, size, delay, duration, opacity };
});

// Ambient background for /app — a quiet, slowly-drifting starfield. Fixed
// behind everything, never intercepts clicks.
export function AnimatedBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-app">
      <div className="star-field">
        {STARS.map((star, i) => (
          <span
            key={i}
            className="star"
            style={
              {
                top: `${star.top}%`,
                left: `${star.left}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                animationDelay: `${star.delay}s`,
                animationDuration: `${star.duration}s`,
                "--base-opacity": star.opacity,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
