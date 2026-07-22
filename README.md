# Krispy

Turns a video topic into a finished, ready-to-post short-form video
(YouTube Shorts / Reels / TikTok): chat with Gemini to land on a topic and
scene-by-scene script, review/regenerate AI images and voiceover per scene
(BYOK — your own Gemini/ElevenLabs key), then automatically assemble
everything into a downloadable MP4 via Remotion.

**BYOK phase, current state:** every generative call — chat/scripting
included — runs on keys each user connects themselves in Settings, not a
shared platform key. Chat is a trial swap to Gemini for now: `src/lib/gemini.ts`
calls the user's own key (`getUserProviderKey(userId, "GEMINI")` in
`src/lib/providers.ts`) via `generateContent`, with the same stage-gated
tool-calling the Claude version used. `src/lib/anthropic.ts` and the
`ANTHROPIC` BYOK provider are still in place unused, so switching chat back
to Claude — or later to a shared platform-funded key — is a contained change.
(An earlier OpenAI trial swap was tried and reverted; `src/lib/openai.ts` is
gone, though the now-unused `OPENAI` BYOK enum value stays in the DB schema
since Postgres can't drop enum values without recreating the type.)

## Stack

- Next.js (App Router, TypeScript) — UI + API routes
- Prisma + Postgres — data model (`prisma/schema.prisma`)
- Auth.js (NextAuth v5), Google OAuth, database sessions
- Gemini `generateContent` (with function calling) — topic suggestion,
  script writing, conversational editing, on the user's own BYOK Gemini key
  (`src/lib/gemini.ts`, `src/app/api/projects/[id]/chat`). Trial swap from
  Claude — `src/lib/anthropic.ts` still exists, unused, for an easy revert.
- BYOK provider calls for image/voice generation (`src/lib/providers.ts`) —
  Gemini for images/voice, ElevenLabs optional for premium voice. Keys are
  stored AES-256-GCM encrypted (`src/lib/crypto.ts`)
- Remotion — declarative video composition (`src/remotion/`), rendered via
  `@remotion/renderer`
- BullMQ + Redis — queues renders onto a separate worker process so a render
  never blocks a request (`src/lib/queue/`)

## Local setup

1. `cp .env.example .env` and fill in:
   - `DATABASE_URL` — Postgres connection string
   - `REDIS_URL` — Redis connection string
   - `API_KEY_ENCRYPTION_SECRET` — `openssl rand -base64 32`
   - `AUTH_SECRET` — `openssl rand -base64 32`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — OAuth app credentials
2. `npm install`
3. `npm run db:migrate` — applies the Prisma schema
4. `npm run dev` — starts the Next.js app on http://localhost:3000
5. `npm run worker` — starts the render worker (separate process, needs
   Redis running)

Rendered MP4s are written locally to `RENDER_OUTPUT_DIR` (default
`./renders`); generated images/voiceovers are written to
`public/generated/<projectId>/`. Swap both for real object storage (S3/R2)
before deploying.

## Remotion

`npm run remotion:studio` opens the Remotion Studio against
`src/remotion/index.ts` for previewing/tweaking the `ShortVideo` composition
outside the full app.
