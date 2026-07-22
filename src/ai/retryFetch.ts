import { describeProviderError, isTransientRateLimit } from "@/ai/apiErrors";

// Backoff before each retry — 3 attempts beyond the first, ~17s worst case.
// Only covers transient rate-limiting (a 429 that isn't the daily quota
// cap); the daily cap won't resolve by waiting a few seconds, so that case
// still fails immediately with the existing friendly message.
const RETRY_DELAYS_MS = [2000, 5000, 10000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Wraps a provider fetch call with automatic retry-with-backoff for
// transient rate-limit errors — a lot of the 429s hit during heavy testing
// this session were momentary per-minute throttling, not the daily cap, and
// would have succeeded a few seconds later instead of failing the user's
// request outright. `doFetch` must be safe to call more than once (a fresh
// fetch each time, no shared mutable state).
export async function fetchWithRetry(
  provider: string,
  doFetch: () => Promise<Response>,
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await doFetch();
    if (res.ok) return res;

    const body = await res.text();
    const canRetry = attempt < RETRY_DELAYS_MS.length && isTransientRateLimit(res.status, body);
    if (!canRetry) {
      throw new Error(describeProviderError(provider, res.status, body));
    }
    await sleep(RETRY_DELAYS_MS[attempt]);
  }
}
