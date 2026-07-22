import { prisma } from "@/lib/prisma";
import { generateChatCompletion, type GeminiHistoryMessage, type GeminiChatResult } from "@/lib/gemini";
import { buildSystemPrompt, getToolsForStage, type PromptProject, type PromptScene } from "@/lib/prompts";

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
