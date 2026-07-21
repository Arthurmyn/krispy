import Anthropic from "@anthropic-ai/sdk";

export const SCRIPT_MODEL = "claude-sonnet-5";

// BYOK phase: chat/script generation runs on the user's own Claude key
// (src/lib/providers.ts -> getUserProviderKey(userId, "ANTHROPIC")) instead
// of a shared platform key, so a new client is built per request rather
// than reused as a singleton. Once the business buys its own token pool,
// this can go back to one shared client built from an env var.
export function createAnthropicClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}
