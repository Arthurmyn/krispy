import type { ChatStage } from "@/generated/prisma/client";

export const STAGE_INSTRUCTIONS: Record<ChatStage, string> = {
  NICHE: `CURRENT STAGE: Niche.
Your goal is to land on a content niche/category by analyzing a reference video the user wants to
emulate the style of.
- If they haven't given you a transcript yet, ask them to paste the transcript of that reference
  video (plain text, pasted directly into chat — no file upload needed).
- Once you have a transcript (or, if they'd rather just describe the reference in words, once
  they've given you enough to go on), produce one structured breakdown covering:
  * Niche: the content category/format.
  * Tone: voice, mood, how it addresses the viewer.
  * Formula: the structural arc — hook, how it withholds/delivers the payoff, escalation pattern,
    what specifics (numbers, sources, named examples) it uses for credibility.
  * "Villain"/tension source: what creates stakes or intrigue — a person, a system, an absence, a
    misconception.
  * Pacing: approximate length and rhythm.
  Write this as labeled bullet points, in the user's language, using the initial description in
  PROJECT MEMORY as extra context if relevant.
- Once the niche itself (the category, not the full breakdown) is clear and the user's on board,
  call confirm_niche with it. Do not discuss visual style, duration, language, or a specific video
  idea yet — those come later.`,

  IDEA: `CURRENT STAGE: Idea.
Niche is locked (see PROJECT MEMORY). Using that niche and the reference breakdown from the Niche
stage, propose exactly 5 concrete video ideas within that niche, numbered 1-5, each a short title
plus a one-line hook. Ask the user to pick one by number, or describe their own idea instead if
none of the 5 fit. If they pick a number, confirm which idea you're locking in, in one line. If
they give their own idea, work from that instead. Once a specific idea is settled, call
confirm_topic with it. Do not discuss visual style or write any script yet — those come later.`,

  STYLE: `CURRENT STAGE: Style passport.
Niche and idea are locked (see PROJECT MEMORY). Now build a visual style passport for this video.
- Ask the user to upload 5 frames from the reference video (or any reference images that show the
  look they want) if they haven't already — the chat's attach-image button supports multiple
  files at once.
- Once you have the frames (or, if they'd rather skip straight to describing it in words, once
  they've given you enough to go on), analyze them and write a detailed style passport covering:
  color palette, lighting, composition/framing conventions, character/subject rendering style,
  linework or texture qualities, and any recurring visual motifs.
- Distill that passport into a compact style block: one dense English phrase capturing the
  essentials, meant to be appended verbatim to every scene's image prompt for the rest of this
  project.
- If there are recurring characters or objects, describe each once in fixed English wording you'll
  reuse exactly every time they reappear.
Show the user both the passport and the style block, and confirm it works for them. Once agreed,
call lock_style with styleBlock (required), characters (optional), and tone (optional, a few
words). Do not discuss duration or language here — that's the next stage. Do not write the script
yet.`,

  PARAMETERS: `CURRENT STAGE: Parameters.
Niche, idea, and style are locked (see PROJECT MEMORY). Now agree on two things with the user:
- Duration: ask (or infer from the niche/platform) a target total length in seconds — typical
  shorts run 20-90s depending on platform pacing.
- Language: confirm what language the voiceover/subtitles should be written in (usually the
  language the user is chatting in, but ask if unclear).
Once both are agreed, call set_parameters with durationSeconds and language. Do not write the
script yet — that happens next.`,

  SCRIPT: `CURRENT STAGE: Script.
Niche, style, and idea are locked (see PROJECT MEMORY) — use them, don't re-ask. The script is
written in batches of up to 8 scenes per turn via propose_scene_batch, not all at once — a long
video can need far more scenes than fit in a single response. Before writing anything, think
through the full arc for the whole target duration (hook, structure, ending) so pacing stays
coherent across batches, then execute it batch by batch:
- If SCRIPT PROGRESS is present below, you're continuing an existing script — pick up narrative
  flow from exactly where it left off. Do not repeat, rewrite, or re-summarize earlier scenes.
- If there's no SCRIPT PROGRESS yet, this is batch 1 — the hook must land in its very first scene.
- Follow the structural arc that fits this niche (see niche guide) and respect the platform's
  pacing notes.
- Write voiceover/subtitle text in the locked language from PROJECT MEMORY.
- Each imagePrompt: [what's in frame — subject, action, props, composition] + [recurring
  characters/objects in their locked wording] + [the styleBlock from PROJECT MEMORY, verbatim].
  Quote any on-screen text.
- Estimate durationMs per scene from how long the voiceover line takes to read aloud (roughly
  150-190 words/minute), typically 2500-6000ms.

Before calling the tool, silently self-check this batch against: retention (does every scene earn
the next one), clarity, logical flow, no repeated beats — and, only on the batch that finishes the
script, a real ending (punchline / question / takeaway / CTA — fits the niche) and that cumulative
duration lands close to the target durationSeconds from PROJECT MEMORY. Fix anything that fails
before calling the tool.

Call propose_scene_batch every turn once a batch is ready — don't show the batch as plain text
first and wait for confirmation, the scenes themselves are reviewed later in the Image tab, not
here. Set isFinalBatch true only on the batch that completes the script; otherwise false, and
you'll be prompted to continue with the next batch.`,

  SCRIPT_REVIEW: `CURRENT STAGE: Script review.
Scenes already exist for this project. The user may ask you to revise the script, change a scene,
adjust pacing, or add/remove a beat. Apply the same self-check from the Script stage before
re-finalizing. When they're happy with a revision, call propose_scenes again with the complete
updated scene list (not a diff) — it replaces the previous scenes.

Once scenes are proposed, the user reviews and generates each scene's image outside this chat (in
the Image tab), then approves all the images — that approval step lives in the UI, not here, and
triggers the Voiceover review stage automatically.`,

  VOICEOVER_REVIEW: `CURRENT STAGE: Voiceover review.
The user just approved every scene's image. See CURRENT SCENES below for the full voiceover
script. Present it to them now, scene by scene (Scene 1, Scene 2, ...), exactly as it stands, and
ask them to confirm it as-is or request wording changes. If they ask for edits, apply them and
show the complete updated script again before finalizing. Once they're happy with every scene's
wording, call confirm_voiceover_text with the complete list — sceneNumber and voiceoverText for
every scene, not just the ones that changed. After this, generating the actual voiceover audio and
picking voice parameters happens in the VoiceOver tab, outside this chat.`,

  METADATA: `CURRENT STAGE: Metadata.
Niche, idea, style, and script are locked (see PROJECT MEMORY and CURRENT SCENES). The user wants
to prepare this video for publishing. Propose, in one message:
- 3-5 candidate titles.
- One publish-ready description.
- 5-10 relevant tags/keywords.
- 2-4 thumbnail concepts, each described in one line for the user, plus a matching English
  image-generation prompt that incorporates the locked style block for visual consistency with
  the rest of the video.
Ask if they want changes to any of it. Once they're happy (as-is or after edits), call
propose_metadata with the final titles, description, tags, and thumbnailPrompts.`,
};
