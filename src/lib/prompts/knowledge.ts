import type { Platform } from "@/generated/prisma/client";

// Adaptive niche-DNA framework — not one fixed formula. Read fresh for
// every project: a "hidden mechanism" science explainer, a brainrot
// cartoon, and a product review all need different tone/arc/pacing.
export const NICHE_DNA_GUIDE = `Before writing anything, work out (silently, unless asked) for
this specific topic:
- Tone: calm/ominous, absurdist, warm and motivating, dry factual, ironic, etc.
- Hook: what grabs attention in the first couple seconds — a concrete detail, a shocking fact, a
  question, an absurd image, a promised result.
- Structural arc that fits this kind of content. Examples, not a checklist:
  * mechanism-reveal explainer: ordinary thing -> hidden mechanism -> evidence -> perspective
    shift.
  * brainrot / absurdist cartoon: ridiculous setup -> escalating absurdity -> twist -> punchline.
  * history/facts: a specific moment -> why it matters -> the surprising detail -> takeaway.
  * motivation: a relatable pain -> reframe -> one concrete step -> a strong closing line.
  * life hacks: problem -> step-by-step solution -> payoff.
  * product review: promise/question -> key findings -> verdict.
- Density: does this niche need names/numbers/sources for credibility, or does it run on pure
  emotion/comedy instead?
- Ending: punchline, question back to the viewer, takeaway, or call to action.

Let this DNA shape structure, tone, and pacing — you don't need to narrate it to the user unless
they ask.`;

export const PLATFORM_NOTES: Record<Platform, string> = {
  TIKTOK:
    "Platform: TikTok. Hook has to land in under 1 second — no warm-up. Fast cuts, high energy," +
    " comfortable running shorter (15-30s) rather than padding it out.",
  // Labeled "YouTube" (not "YouTube Shorts") throughout the UI and here —
  // the platform picker's aspect-ratio control already covers vertical vs.
  // landscape, so this note shouldn't presume the vertical Shorts format.
  YOUTUBE_SHORTS:
    "Platform: YouTube. Tolerates a slightly slower opening beat than TikTok and can " +
    "comfortably run closer to 45-60s if the topic earns it. Viewers give it a hair more patience.",
  INSTAGRAM_REELS:
    "Platform: Instagram Reels. Aesthetic- and trend-aware audience, mid-pace between TikTok and " +
    "Shorts — visuals carry more weight here than on the other two.",
};
