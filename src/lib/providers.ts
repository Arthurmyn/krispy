import { prisma } from "@/lib/prisma";
import { decryptApiKey } from "@/lib/crypto";
import { describeProviderError } from "@/lib/apiErrors";
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

export async function generateSceneImage(
  userId: string,
  prompt: string,
  aspectRatio: "9:16" | "16:9" | "1:1",
  referenceImage?: { base64: string; mimeType: string },
): Promise<{ imageBase64: string; mimeType: string }> {
  const apiKey = await getUserProviderKey(userId, "GEMINI");

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

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { aspectRatio },
      }),
    },
  );

  if (!res.ok) {
    throw new Error(describeProviderError("Gemini", res.status, await res.text()));
  }

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
): Promise<{ audioBase64: string; mimeType: string }> {
  const provider = options?.provider ?? "GEMINI";
  const apiKey = await getUserProviderKey(userId, provider);

  if (provider === "ELEVENLABS") {
    const voiceId = options?.voiceId ?? "21m00Tcm4TlvDq8ikWAM";
    const settings = options?.elevenLabsSettings;
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
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
      },
    );
    if (!res.ok) {
      throw new Error(describeProviderError("ElevenLabs", res.status, await res.text()));
    }
    const audioBuffer = await res.arrayBuffer();
    return {
      audioBase64: Buffer.from(audioBuffer).toString("base64"),
      mimeType: "audio/mpeg",
    };
  }

  const voiceName = options?.voiceId;
  const res = await fetch(
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
  );
  if (!res.ok) {
    throw new Error(describeProviderError("Gemini", res.status, await res.text()));
  }
  const data = await res.json();
  const part = data.candidates?.[0]?.content?.parts?.find(
    (p: { inlineData?: unknown }) => p.inlineData,
  );
  if (!part?.inlineData) {
    throw new Error("Gemini TTS response did not contain audio data");
  }
  return {
    audioBase64: part.inlineData.data,
    mimeType: part.inlineData.mimeType ?? "audio/wav",
  };
}
