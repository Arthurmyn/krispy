// Fixed royalty-free background music catalog. No BYOK key, no per-user
// upload — the platform ships a small curated set of tracks.
//
// `url` points at a static file under public/music/. The mp3s themselves
// aren't in the repo yet (see MUSIC.md for where to source and drop them);
// until they exist, playback in the picker will 404, which is expected.
export type MusicTrack = {
  id: string;
  title: string;
  mood: "upbeat" | "chill" | "dramatic" | "corporate" | "cinematic";
  url: string;
  credit: string;
};

export const MUSIC_LIBRARY: MusicTrack[] = [
  {
    id: "upbeat-1",
    title: "Bright Momentum",
    mood: "upbeat",
    url: "/music/upbeat-1.mp3",
    credit: "TBD",
  },
  {
    id: "chill-1",
    title: "Soft Focus",
    mood: "chill",
    url: "/music/chill-1.mp3",
    credit: "TBD",
  },
  {
    id: "dramatic-1",
    title: "Rising Tension",
    mood: "dramatic",
    url: "/music/dramatic-1.mp3",
    credit: "TBD",
  },
  {
    id: "corporate-1",
    title: "Clean Slate",
    mood: "corporate",
    url: "/music/corporate-1.mp3",
    credit: "TBD",
  },
  {
    id: "cinematic-1",
    title: "Wide Horizon",
    mood: "cinematic",
    url: "/music/cinematic-1.mp3",
    credit: "TBD",
  },
];

export function findMusicTrack(id: string | null): MusicTrack | null {
  if (!id) return null;
  return MUSIC_LIBRARY.find((t) => t.id === id) ?? null;
}
