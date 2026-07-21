import type Anthropic from "@anthropic-ai/sdk";
import { describeProviderError } from "@/lib/apiErrors";

// Trial swap: chat/script generation runs on the user's own OpenAI key for
// now instead of Gemini (src/lib/gemini.ts is still here, untouched, so
// switching back is just swapping the import in the chat route). Gemini's
// free tier hit its daily request cap during testing; image/voice
// generation stays on Gemini either way (src/lib/providers.ts).
export const CHAT_MODEL = "gpt-4o-mini";

export type OpenAIHistoryMessage = {
  role: "user" | "model";
  text: string;
  // Only meaningful on the latest turn — see the same note in gemini.ts.
  images?: { base64: string; mimeType: string }[];
};

export type OpenAIToolCall = { name: string; input: unknown };

export type OpenAIChatResult = {
  text: string;
  toolCall: OpenAIToolCall | null;
};

function toOpenAITools(tools: Anthropic.Tool[]) {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
}

export async function generateChatCompletion(options: {
  apiKey: string;
  systemPrompt: string;
  tools: Anthropic.Tool[];
  history: OpenAIHistoryMessage[];
}): Promise<OpenAIChatResult> {
  const messages = [
    { role: "system" as const, content: options.systemPrompt },
    ...options.history.map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.images?.length
        ? [
            { type: "text" as const, text: m.text },
            ...m.images.map((image) => ({
              type: "image_url" as const,
              image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
            })),
          ]
        : m.text,
    })),
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      tools: options.tools.length ? toOpenAITools(options.tools) : undefined,
      tool_choice: options.tools.length ? "auto" : undefined,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(describeProviderError("OpenAI", res.status, body));
  }

  const data = await res.json();
  const message = data.choices?.[0]?.message ?? {};
  const text = typeof message.content === "string" ? message.content.trim() : "";

  const rawToolCall = message.tool_calls?.[0];
  const toolCall = rawToolCall
    ? {
        name: rawToolCall.function.name,
        input: JSON.parse(rawToolCall.function.arguments || "{}"),
      }
    : null;

  return { text, toolCall };
}
