import { prisma } from "@/backend/prisma";
import { generateChatCompletion, type GeminiHistoryMessage, type GeminiChatResult } from "@/ai/gemini";
import { buildSystemPrompt, getToolsForStage, type PromptProject, type PromptScene } from "@/ai/prompts";

// Shared by the user-driven chat route and any server-triggered turn (e.g.
// the voiceover-review message fired right after image approval) — builds
// the stage-aware prompt, calls Gemini, and persists the assistant reply.
// Callers still handle their own tool-call side effects and the "model
// returned nothing" empty-response case.
export async function runAssistantTurn(options: {
  apiKey: string;
  projectId: string;
  project: PromptProject;
  scenes?: PromptScene[];
  history: GeminiHistoryMessage[];
}): Promise<GeminiChatResult> {
  const result = await generateChatCompletion({
    apiKey: options.apiKey,
    systemPrompt: buildSystemPrompt(options.project, options.scenes),
    tools: getToolsForStage(options.project.chatStage),
    history: options.history,
  });

  if (result.text) {
    await prisma.chatMessage.create({
      data: { projectId: options.projectId, role: "ASSISTANT", content: result.text },
    });
  }

  return result;
}

// Appends one propose_scene_batch turn's scenes to whatever already exists
// for the project — used by the SCRIPT stage's batch loop (see
// src/app/api/projects/[id]/chat/route.ts), as opposed to propose_scenes'
// full delete-and-replace semantics used elsewhere.
export async function appendScriptBatch(
  projectId: string,
  scenes: { script: string; imagePrompt: string; durationMs?: number }[],
  startOrder: number,
): Promise<void> {
  await prisma.scene.createMany({
    data: scenes.map((scene, i) => ({
      projectId,
      order: startOrder + i,
      script: scene.script,
      imagePrompt: scene.imagePrompt,
      durationMs: scene.durationMs,
    })),
  });
}
