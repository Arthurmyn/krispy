import type Anthropic from "@anthropic-ai/sdk";
import { describeProviderError } from "@/lib/apiErrors";

// Trial swap: chat/script generation runs on the user's own Gemini key for
// now instead of Claude (src/lib/anthropic.ts is still here, untouched, so
// switching back is just swapping the import in the chat route). Reuses the
// same buildSystemPrompt/getToolsForStage output — those are provider-
// agnostic — and converts the Anthropic-shaped tool schemas to Gemini's
// FunctionDeclaration format below.
//
// Flash, not Pro: the Pro tier has a 0 free-tier quota (not "exhausted" —
// literally zero), so BYOK users on a free Google AI Studio key get an
// immediate 429 on every request. Flash has an actual free allowance.
export const CHAT_MODEL = "gemini-2.5-flash";

type JsonSchema = {
  type: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
};

function convertSchema(schema: JsonSchema): Record<string, unknown> {
  const result: Record<string, unknown> = { type: schema.type.toUpperCase() };
  if (schema.description) result.description = schema.description;
  if (schema.properties) {
    result.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]) => [
        key,
        convertSchema(value),
      ]),
    );
  }
  if (schema.items) result.items = convertSchema(schema.items);
  if (schema.required) result.required = schema.required;
  return result;
}

function toFunctionDeclarations(tools: Anthropic.Tool[]) {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: convertSchema(tool.input_schema as JsonSchema),
  }));
}

export type GeminiHistoryMessage = {
  role: "user" | "model";
  text: string;
  // Only meaningful on the latest turn — past images aren't persisted
  // (ChatMessage only stores text), so history reconstructed from the DB is
  // always text-only. Used for style-reference photo uploads: the model
  // analyzes them in this turn and folds what it sees into styleBlock via
  // lock_style; the photos themselves aren't re-sent on later turns.
  images?: { base64: string; mimeType: string }[];
};

export type GeminiToolCall = { name: string; input: unknown };

export type GeminiChatResult = {
  text: string;
  toolCall: GeminiToolCall | null;
};

export async function generateChatCompletion(options: {
  apiKey: string;
  systemPrompt: string;
  tools: Anthropic.Tool[];
  history: GeminiHistoryMessage[];
}): Promise<GeminiChatResult> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${CHAT_MODEL}:generateContent?key=${options.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: options.systemPrompt }] },
        contents: options.history.map((m) => ({
          role: m.role,
          parts: [
            ...(m.images ?? []).map((image) => ({
              inlineData: { mimeType: image.mimeType, data: image.base64 },
            })),
            { text: m.text },
          ],
        })),
        tools: options.tools.length
          ? [{ functionDeclarations: toFunctionDeclarations(options.tools) }]
          : undefined,
        generationConfig: { maxOutputTokens: 2048 },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(describeProviderError("Gemini", res.status, body));
  }

  const data = await res.json();
  const parts: Array<{ text?: string; functionCall?: { name: string; args: unknown } }> =
    data.candidates?.[0]?.content?.parts ?? [];

  const text = parts
    .filter((p) => typeof p.text === "string")
    .map((p) => p.text)
    .join("\n")
    .trim();

  const functionCallPart = parts.find((p) => p.functionCall);
  const toolCall = functionCallPart?.functionCall
    ? { name: functionCallPart.functionCall.name, input: functionCallPart.functionCall.args }
    : null;

  return { text, toolCall };
}
