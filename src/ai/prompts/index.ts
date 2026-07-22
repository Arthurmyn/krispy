import type Anthropic from "@anthropic-ai/sdk";
import type { Project, Scene } from "@/generated/prisma/client";
import { CORE_PROMPT } from "./core";
import { NICHE_DNA_GUIDE, PLATFORM_NOTES } from "./knowledge";
import { STAGE_INSTRUCTIONS } from "./stages";
import {
  CONFIRM_NICHE_TOOL,
  CONFIRM_TOPIC_TOOL,
  LOCK_STYLE_TOOL,
  SET_PARAMETERS_TOOL,
  PROPOSE_SCENES_TOOL,
  PROPOSE_SCENE_BATCH_TOOL,
  CONFIRM_VOICEOVER_TEXT_TOOL,
  PROPOSE_METADATA_TOOL,
} from "./tools";

export type PromptProject = Pick<
  Project,
  | "category"
  | "topic"
  | "aspectRatio"
  | "platform"
  | "audience"
  | "tone"
  | "styleBlock"
  | "characters"
  | "durationSeconds"
  | "language"
  | "chatStage"
>;

export type PromptScene = Pick<Scene, "order" | "script" | "voiceoverText" | "durationMs">;

function formatProjectMemory(project: PromptProject): string {
  const nicheLocked = project.chatStage !== "NICHE";
  const lines = [
    `${nicheLocked ? "Niche (locked)" : "Initial description"}: ${project.category}`,
    `Aspect ratio: ${project.aspectRatio.replace("RATIO_", "").replace("_", ":")}`,
    `Platform: ${project.platform}`,
  ];
  if (project.audience) lines.push(`Audience: ${project.audience}`);
  if (project.tone) lines.push(`Tone (locked): ${project.tone}`);
  if (project.styleBlock) lines.push(`Style block (locked): ${project.styleBlock}`);
  if (project.characters) lines.push(`Recurring characters/objects: ${project.characters}`);
  if (project.durationSeconds) lines.push(`Target duration (locked): ${project.durationSeconds}s`);
  if (project.language) lines.push(`Language (locked): ${project.language}`);
  if (project.topic) lines.push(`Idea/topic (locked): ${project.topic}`);

  return `PROJECT MEMORY (already known — don't re-ask for any of this):\n${lines
    .map((l) => `- ${l}`)
    .join("\n")}`;
}

function formatScenes(scenes: PromptScene[]): string {
  const sorted = [...scenes].sort((a, b) => a.order - b.order);
  const lines = sorted.map(
    (s, i) => `Scene ${i + 1}: "${s.voiceoverText ?? s.script}"`,
  );
  return `CURRENT SCENES (voiceover text, in order):\n${lines.join("\n")}`;
}

// Lets the SCRIPT stage pick up narrative continuity across batches without
// re-seeing every prior scene's full text (which would itself blow the
// token budget for long scripts) — just the count and running duration.
function formatScriptProgress(scenes: PromptScene[], durationSeconds: number | null): string {
  const sorted = [...scenes].sort((a, b) => a.order - b.order);
  const coveredMs = sorted.reduce((sum, s) => sum + (s.durationMs ?? 0), 0);
  const coveredSeconds = Math.round(coveredMs / 1000);
  const target = durationSeconds ?? 0;
  const remaining = Math.max(target - coveredSeconds, 0);
  return (
    `SCRIPT PROGRESS: ${sorted.length} scene${sorted.length === 1 ? "" : "s"} written so far, ` +
    `covering ~${coveredSeconds}s of the ~${target}s target (${remaining}s remaining). ` +
    `Continue from Scene ${sorted.length + 1} — do not repeat or rewrite earlier scenes.`
  );
}

export function buildSystemPrompt(project: PromptProject, scenes?: PromptScene[]): string {
  return [
    CORE_PROMPT,
    NICHE_DNA_GUIDE,
    PLATFORM_NOTES[project.platform],
    formatProjectMemory(project),
    scenes && scenes.length && project.chatStage === "SCRIPT"
      ? formatScriptProgress(scenes, project.durationSeconds)
      : null,
    // Full per-scene text is only relevant (and only cheap) outside the
    // batched SCRIPT stage — formatScriptProgress covers SCRIPT instead so
    // long scripts don't re-send every prior scene's full text each batch.
    scenes && scenes.length && project.chatStage !== "SCRIPT" ? formatScenes(scenes) : null,
    STAGE_INSTRUCTIONS[project.chatStage],
  ]
    .filter((section): section is string => Boolean(section))
    .join("\n\n");
}

export function getToolsForStage(stage: PromptProject["chatStage"]): Anthropic.Tool[] {
  switch (stage) {
    case "NICHE":
      return [CONFIRM_NICHE_TOOL];
    case "IDEA":
      return [CONFIRM_TOPIC_TOOL];
    case "STYLE":
      return [LOCK_STYLE_TOOL];
    case "PARAMETERS":
      return [SET_PARAMETERS_TOOL];
    case "SCRIPT":
      return [PROPOSE_SCENE_BATCH_TOOL];
    case "SCRIPT_REVIEW":
      return [PROPOSE_SCENES_TOOL];
    case "VOICEOVER_REVIEW":
      return [CONFIRM_VOICEOVER_TEXT_TOOL];
    case "METADATA":
      return [PROPOSE_METADATA_TOOL];
  }
}
