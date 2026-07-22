import { prisma } from "@/lib/prisma";
import { decryptApiKey } from "@/lib/crypto";
import { fetchWithRetry } from "@/lib/retryFetch";
import type { ApiKeyProvider } from "@/generated/prisma/client";

// BYOK: fetches and decrypts the user's own provider key (image/voice
// generation, or chat/script generation for ANTHROPIC). Throws if the user
// hasn't connected that provider yet.
export async function getUserProviderKey(
  userId: string,
  provider: ApiKeyProvider,
): Promise<string> {
  const record = await prisma.apiKey.findUnique({
    where: { userId_provider: { userId, provider } },
  });
  if (!record) {
    throw new Error(
      `No ${provider} API key connected for this user. Add one in settings.`,
    );
  }
  return decryptApiKey(record.encryptedKey);
}

// MVP trial: users who haven't connected their own Gemini key yet can still
// generate — up to trialGenerationsRemaining times — on a platform-funded
// key (billed to us, see PLATFORM_GEMINI_API_KEY in .env). Once they've
// connected their own key, that always wins; the trial pool is purely a
// fallback for people who haven't set up BYOK yet. Every call site that
// generates via Gemini (chat, images, voiceover) should resolve its key
// through this instead of calling getUserProviderKey(userId, "GEMINI")
// directly, and call consumeTrialGeneration after a successful call when
// usedTrial is true.
export async function resolveGeminiKey(
  userId: string,
): Promise<{ apiKey: string; usedTrial: boolean }> {
  const own = await prisma.apiKey.findUnique({
    where: { userId_provider: { userId, provider: "GEMINI" } },
  });
  if (own) {
    return { apiKey: decryptApiKey(own.encryptedKey), usedTrial: false };
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const platformKey = process.env.PLATFORM_GEMINI_API_KEY;
  if (user.trialGenerationsRemaining > 0 && platformKey) {
    return { apiKey: platformKey, usedTrial: true };
  }

  throw new Error(
    "No GEMINI API key connected for this user. Add one in settings.",
  );
}

// Only call after the generation this trial credit paid for actually
// succeeded — a failed call shouldn't burn the user's trial pool.
export async function consumeTrialGeneration(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { trialGenerationsRemaining: { decrement: 1 } },
  });
}

export async function generateSceneImage(
  userId: string,
  prompt: string,
  aspectRatio: "9:16" | "16:9" | "1:1",
  referenceImage?: { base64: string; mimeType: string },
): Promise<{ imageBase64: string; mimeType: string; usedTrial: boolean }> {
  const { apiKey, usedTrial } = await resolveGeminiKey(userId);

  // Dropping a reference image turns this into an edit: the image goes in
  // as inline data alongside the instruction text, and Gemini edits it
  // instead of generating a scene from scratch.
  const parts = referenceImage
    ? [
        {
          inlineData: {
            mimeType: referenceImage.mimeType,
            data: referenceImage.base64,
          },
        },
        { text: prompt },
      ]
    : [{ text: prompt }];

  const res = await fetchWithRetry("Gemini", () =>
    fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts }],
          // aspectRatio lives under imageConfig, not directly on
          // generationConfig — the API rejects it as an unknown field
          // otherwise ("Invalid JSON payload... Cannot find field").
          generationConfig: { imageConfig: { aspectRatio } },
        }),
      },
    ),
  );

  const data = await res.json();
  const part = data.candidates?.[0]?.content?.parts?.find(
    (p: { inlineData?: unknown }) => p.inlineData,
  );
  if (!part?.inlineData) {
    throw new Error("Gemini response did not contain image data");
  }

  return {
    imageBase64: part.inlineData.data,
    mimeType: part.inlineData.mimeType ?? "image/png",
    usedTrial,
  };
}

// ElevenLabs' documented voice_settings knobs (v1 text-to-speech). No
// "speed" field here — that's not part of the standard voice_settings API,
// unlike stability/similarity/style which are.
export type ElevenLabsVoiceSettings = {
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
};

export async function generateVoiceover(
  userId: string,
  text: string,
  options?: {
    provider?: "GEMINI" | "ELEVENLABS";
    voiceId?: string;
    elevenLabsSettings?: ElevenLabsVoiceSettings;
  },
): Promise<{ audioBase64: string; mimeType: string; usedTrial: boolean }> {
  const provider = options?.provider ?? "GEMINI";
  // Trial pool only covers Gemini (that's the platform-funded key we hold)
  // — ElevenLabs stays BYOK-only, no fallback there.
  const { apiKey, usedTrial } =
    provider === "ELEVENLABS"
      ? { apiKey: await getUserProviderKey(userId, provider), usedTrial: false }
      : await resolveGeminiKey(userId);

  if (provider === "ELEVENLABS") {
    const voiceId = options?.voiceId ?? "21m00Tcm4TlvDq8ikWAM";
    const settings = options?.elevenLabsSettings;
    const res = await fetchWithRetry("ElevenLabs", () =>
      fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: settings
            ? {
                stability: settings.stability,
                similarity_boost: settings.similarityBoost,
                style: settings.style,
                use_speaker_boost: settings.useSpeakerBoost,
              }
            : undefined,
        }),
      }),
    );
    const audioBuffer = await res.arrayBuffer();
    return {
      audioBase64: Buffer.from(audioBuffer).toString("base64"),
      mimeType: "audio/mpeg",
      usedTrial,
    };
  }

  const voiceName = options?.voiceId;
  const res = await fetchWithRetry("Gemini", () =>
    fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: voiceName
              ? { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
              : undefined,
          },
        }),
      },
    ),
  );
  const data = await res.json();
  const part = data.candidates?.[0]?.content?.parts?.find(
    (p: { inlineData?: unknown }) => p.inlineData,
  );
  if (!part?.inlineData) {
    throw new Error("Gemini TTS response did not contain audio data");
  }

  // Gemini TTS returns headerless raw PCM (mimeType like
  // "audio/L16;codec=pcm;rate=24000") — browsers can't play that directly
  // via <audio>, it needs a WAV header wrapped around it first.
  const rawMimeType: string = part.inlineData.mimeType ?? "";
  const pcmMatch = rawMimeType.match(/^audio\/L(\d+);codec=pcm;rate=(\d+)/);
  if (pcmMatch) {
    const bitsPerSample = Number(pcmMatch[1]);
    const sampleRate = Number(pcmMatch[2]);
    const pcmBuffer = Buffer.from(part.inlineData.data, "base64");
    const wavBuffer = wrapPcmInWav(pcmBuffer, sampleRate, bitsPerSample);
    return { audioBase64: wavBuffer.toString("base64"), mimeType: "audio/wav", usedTrial };
  }

  return {
    audioBase64: part.inlineData.data,
    mimeType: rawMimeType || "audio/wav",
    usedTrial,
  };
}

// Builds a standard 44-byte WAV header around headerless PCM data — see the
// Gemini TTS branch of generateVoiceover above for why this is needed.
function wrapPcmInWav(
  pcm: Buffer,
  sampleRate: number,
  bitsPerSample: number,
  channels = 1,
): Buffer {
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // audio format: PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}
