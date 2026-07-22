// Turns a raw provider error (status + body) into a short, human-readable
// message instead of dumping the provider's JSON straight into the UI.
// Shared across chat (Gemini) and image/voice (Gemini/ElevenLabs)
// calls — they're different APIs but the same handful of failure shapes
// (quota, bad key, rate limit) show up everywhere.
export function describeProviderError(
  provider: string,
  status: number,
  rawBody: string,
): string {
  const body = rawBody.toLowerCase();

  if (
    status === 429 ||
    body.includes("resource_exhausted") ||
    body.includes("insufficient_quota") ||
    body.includes("rate_limit") ||
    body.includes("quota")
  ) {
    const isDaily = body.includes("perday") || body.includes("per_day");
    return isDaily
      ? `You've hit ${provider}'s daily free-tier limit. Wait for it to reset, add billing on your ${provider} account for higher limits, or switch to a different key in Settings.`
      : `${provider} is rate-limiting your key right now. Wait a moment and try again, or add billing on your ${provider} account for higher limits.`;
  }

  if (status === 401 || status === 403) {
    return `Your ${provider} API key was rejected — double-check it in Settings → API keys.`;
  }

  if (status >= 500) {
    return `${provider} is having issues on their end right now. Try again in a bit.`;
  }

  return `${provider} request failed (${status}). Try again, or check your key in Settings.`;
}
