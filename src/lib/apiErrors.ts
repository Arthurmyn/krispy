// Turns a raw provider error (status + body) into a short, human-readable
// message instead of dumping the provider's JSON straight into the UI.
// Shared across chat (Gemini) and image/voice (Gemini/ElevenLabs)
// calls — they're different APIs but the same handful of failure shapes
// (quota, bad key, rate limit) show up everywhere.

function isRateLimitError(rawBody: string, status: number): boolean {
  const body = rawBody.toLowerCase();
  return (
    status === 429 ||
    body.includes("resource_exhausted") ||
    body.includes("insufficient_quota") ||
    body.includes("rate_limit") ||
    body.includes("quota")
  );
}

// The daily free-tier cap resets once every 24h — no amount of retrying or
// waiting a few seconds fixes it. Distinct from a transient per-minute
// rate limit, which usually clears up on its own shortly after.
export function isDailyQuotaError(rawBody: string): boolean {
  const body = rawBody.toLowerCase();
  return body.includes("perday") || body.includes("per_day");
}

// Worth an automatic retry: a 429 that's rate-limiting (not the daily cap)
// tends to clear up within seconds. Used by src/lib/retryFetch.ts.
export function isTransientRateLimit(status: number, rawBody: string): boolean {
  return isRateLimitError(rawBody, status) && !isDailyQuotaError(rawBody);
}

export function describeProviderError(
  provider: string,
  status: number,
  rawBody: string,
): string {
  if (isRateLimitError(rawBody, status)) {
    return isDailyQuotaError(rawBody)
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
