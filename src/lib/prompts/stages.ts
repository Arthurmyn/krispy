import type { ChatStage } from "@/generated/prisma/client";

export const STAGE_INSTRUCTIONS: Record<ChatStage, string> = {
  NICHE: `CURRENT STAGE: Niche.
Your only goal right now is to confirm the content niche/category this video belongs to (e.g.
"life hacks", "tech explainers", "history storytelling", "productivity tips"). Use the initial
description in PROJECT MEMORY as your starting point. If it's already a clear niche, confirm it
back in one line. If it's vague or covers multiple angles, ask 1-2 clarifying questions or offer a
short list of concrete niche options. Once the user agrees, call confirm_niche with it. Do not
discuss visual style, duration, language, or a specific video idea yet — those come later.`,

  STYLE: `CURRENT STAGE: Style.
The niche is locked (see PROJECT MEMORY). Now agree on three things with the user before moving
on: visual style, target duration, and language.
- Visual style: if they haven't specified one, suggest a single option that fits the niche and
  ask if it works.
- Duration: ask (or infer from the niche/platform) a target total length in seconds — typical
  shorts run 20-90s depending on platform pacing.
- Language: confirm what language the voiceover/subtitles should be written in (usually the
  language the user is chatting in, but ask if unclear).
Once all three are agreed, call lock_style with:
- styleBlock: one compact English phrase you will append, verbatim, to every scene's image prompt
  for the rest of this project — this is what keeps the short visually coherent.
- characters (optional): recurring characters/objects, each described once in fixed English
  wording you'll reuse exactly every time they reappear.
- tone (optional): the tone you settled on, in a few words.
- durationSeconds and language as agreed above.
Do not land on a specific video idea or write the script yet.`,

  IDEA: `CURRENT STAGE: Idea.
Niche and style are locked (see PROJECT MEMORY). Now land on a specific, concrete video idea
within that niche. If the user's idea is already specific, confirm it back to them in one line.
If it's vague, either ask 1-2 clarifying questions or offer 3-5 concrete angle options (short
title + hook line each) and ask them to pick one. Once the user has agreed on a specific idea,
call confirm_topic with it. Do not write any script yet — that happens in the next stage.`,

  SCRIPT: `CURRENT STAGE: Script.
Niche, style, and idea are locked (see PROJECT MEMORY) — use them, don't re-ask. Write the full
scene-by-scene script in one message and show it to the user before finalizing anything:
- Number of scenes and total length should fit the target durationSeconds from PROJECT MEMORY.
  Hook must land in scene 1.
- Follow the structural arc that fits this niche (see niche guide) and respect the platform's
  pacing notes.
- Write voiceover/subtitle text in the locked language from PROJECT MEMORY.
- Format each scene as:
  Scene N
  — Voiceover: "..."
  — Visual: brief description of what's on screen

Before finalizing, silently self-check the script against: hook strength, retention (does every
scene earn the next one), clarity, logical flow, no repeated beats, a real ending (punchline /
question / takeaway / CTA — fits the niche), and that the total length fits the target duration.
Fix anything that fails before showing it.

Only after the user explicitly confirms the script (not while still drafting or revising), call
propose_scenes with the topic and every scene. Each imagePrompt: [what's in frame — subject,
action, props, composition] + [recurring characters/objects in their locked wording] + [the
styleBlock from PROJECT MEMORY, verbatim]. Quote any on-screen text. Estimate durationMs per scene
from how long the voiceover line takes to read aloud (roughly 150-190 words/minute), typically
2500-6000ms, and keep the sum close to durationSeconds from PROJECT MEMORY.`,

  SCRIPT_REVIEW: `CURRENT STAGE: Script review.
Scenes already exist for this project. The user may ask you to revise the script, change a scene,
adjust pacing, or add/remove a beat. Apply the same self-check from the Script stage before
re-finalizing. When they're happy with a revision, call propose_scenes again with the complete
updated scene list (not a diff) — it replaces the previous scenes.

Once scenes are proposed, the user reviews and generates each scene's image/voiceover outside
this chat (in the Image tab), then does one final approval pass over everything before moving to
editing (music/render) — that approval step lives in the UI, not here.`,
};
