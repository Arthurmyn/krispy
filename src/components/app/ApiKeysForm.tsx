"use client";

import { useEffect, useState } from "react";

type Provider = "GEMINI" | "ELEVENLABS" | "ANTHROPIC" | "OPENAI";

const PROVIDERS: {
  value: Provider;
  label: string;
  required: boolean;
  keyPageUrl: string;
  keyPageLabel: string;
  steps: string[];
}[] = [
  {
    value: "OPENAI",
    label: "OpenAI (chat & script generation)",
    required: true,
    keyPageUrl: "https://platform.openai.com/api-keys",
    keyPageLabel: "platform.openai.com/api-keys",
    steps: [
      "Sign in (or create an account) at the OpenAI Platform.",
      'Go to API keys and click "Create new secret key".',
      "Copy the key that appears — it starts with \"sk-…\".",
      "Paste it into the field below and click Save.",
    ],
  },
  {
    value: "GEMINI",
    label: "Gemini (images + voice)",
    required: true,
    keyPageUrl: "https://aistudio.google.com/apikey",
    keyPageLabel: "aistudio.google.com/apikey",
    steps: [
      "Open Google AI Studio and sign in with your Google account.",
      'Click "Create API key" (pick or create a Google Cloud project if asked).',
      "Copy the key that appears — it starts with \"AIza…\".",
      "Paste it into the field below and click Save.",
    ],
  },
  {
    value: "ANTHROPIC",
    label: "Claude (not used right now)",
    required: false,
    keyPageUrl: "https://console.anthropic.com/settings/keys",
    keyPageLabel: "console.anthropic.com/settings/keys",
    steps: [
      "Chat currently runs on your OpenAI key above — this is on hold for a trial run.",
      "Sign in (or create an account) at the Anthropic Console.",
      'Go to Settings → API Keys and click "Create Key".',
      "Copy the key that appears — it starts with \"sk-ant-…\".",
      "Paste it into the field below and click Save.",
    ],
  },
  // ElevenLabs is still supported by the backend (src/lib/providers.ts) as
  // an optional premium voice — just not surfaced in this form since
  // Gemini alone already covers free voiceover generation.
];

export function ApiKeysForm() {
  const [connected, setConnected] = useState<Set<Provider>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings/api-keys")
      .then((res) => res.json())
      .then((data: { keys: { provider: Provider }[] }) => {
        setConnected(new Set(data.keys.map((k) => k.provider)));
        setLoaded(true);
      });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {PROVIDERS.map((p) => (
        <ApiKeyRow
          key={p.value}
          provider={p.value}
          label={p.label}
          required={p.required}
          keyPageUrl={p.keyPageUrl}
          keyPageLabel={p.keyPageLabel}
          steps={p.steps}
          connected={loaded && connected.has(p.value)}
          onSaved={() =>
            setConnected((prev) => new Set(prev).add(p.value))
          }
        />
      ))}
    </div>
  );
}

function ApiKeyRow({
  provider,
  label,
  required,
  keyPageUrl,
  keyPageLabel,
  steps,
  connected,
  onSaved,
}: {
  provider: Provider;
  label: string;
  required: boolean;
  keyPageUrl: string;
  keyPageLabel: string;
  steps: string[];
  connected: boolean;
  onSaved: () => void;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: value }),
      });
      if (!res.ok) throw new Error(await res.text());
      setValue("");
      onSaved();
    } catch {
      setError("Couldn't save key. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={save}
      className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4"
    >
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-text-primary">
          {label}
          {required ? <span className="text-danger"> *</span> : null}
        </label>
        {connected ? (
          <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
            Connected
          </span>
        ) : null}
      </div>
      <div className="flex gap-2">
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={connected ? "Replace key…" : "Paste API key…"}
          className="flex-1 rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary"
        />
        <button
          type="submit"
          disabled={saving || !value.trim()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}

      <details className="group text-xs text-text-tertiary">
        <summary className="cursor-pointer select-none font-medium hover:text-text-secondary">
          Where do I get this?
        </summary>
        <ol className="mt-2 flex list-decimal flex-col gap-1 pl-4">
          {steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
        <a
          href={keyPageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-accent underline"
        >
          {keyPageLabel} ↗
        </a>
      </details>
    </form>
  );
}
