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

export type PromptScene = Pick<Scene, "order" | "script" | "voiceoverText">;

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

export function buildSystemPrompt(project: PromptProject, scenes?: PromptScene[]): string {
  return [
    CORE_PROMPT,
    NICHE_DNA_GUIDE,
    PLATFORM_NOTES[project.platform],
    formatProjectMemory(project),
    scenes && scenes.length ? formatScenes(scenes) : null,
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
    case "SCRIPT_REVIEW":
      return [PROPOSE_SCENES_TOOL];
    case "VOICEOVER_REVIEW":
      return [CONFIRM_VOICEOVER_TEXT_TOOL];
    case "METADATA":
      return [PROPOSE_METADATA_TOOL];
  }
}
