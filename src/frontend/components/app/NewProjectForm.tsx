"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Clapperboard,
  Music2,
  PlaySquare,
  RectangleHorizontal,
  Settings2,
  Smartphone,
  Sparkles,
  Square,
} from "lucide-react";

const ASPECT_RATIOS: {
  value: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}[] = [
  { value: "RATIO_9_16", label: "9:16", icon: Smartphone },
  { value: "RATIO_16_9", label: "16:9", icon: RectangleHorizontal },
  { value: "RATIO_1_1", label: "1:1", icon: Square },
];

const PLATFORMS: {
  value: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}[] = [
  { value: "TIKTOK", label: "TikTok", icon: Music2 },
  { value: "YOUTUBE_SHORTS", label: "YouTube", icon: PlaySquare },
  { value: "INSTAGRAM_REELS", label: "Instagram Reels", icon: Camera },
];

function PillRow<T extends { value: string; label: string; icon: React.ComponentType<{ size?: number }> }>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-nowrap items-center gap-1 rounded-full border border-border bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={
            o.value === value
              ? "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-2.5 py-1.5 text-xs font-medium text-on-accent"
              : "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary"
          }
        >
          <o.icon size={13} />
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SettingsPopover({
  aspectRatio,
  onAspectRatioChange,
  platform,
  onPlatformChange,
  audience,
  onAudienceChange,
}: {
  aspectRatio: string;
  onAspectRatioChange: (value: string) => void;
  platform: string;
  onPlatformChange: (value: string) => void;
  audience: string;
  onAudienceChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ratioLabel = ASPECT_RATIOS.find((r) => r.value === aspectRatio)?.label;
  const platformLabel = PLATFORMS.find((p) => p.value === platform)?.label;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm text-text-secondary hover:text-text-primary"
      >
        <Settings2 size={14} />
        {ratioLabel} · {platformLabel}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="animate-dropdown-in-down absolute left-0 top-full z-50 mt-2 flex w-[26rem] flex-col gap-4 rounded-2xl border border-border bg-surface-raised p-4 shadow-xl">
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-text-tertiary">Aspect ratio</p>
              <PillRow options={ASPECT_RATIOS} value={aspectRatio} onChange={onAspectRatioChange} />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-text-tertiary">Platform</p>
              <PillRow options={PLATFORMS} value={platform} onChange={onPlatformChange} />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-text-tertiary">Audience (optional)</p>
              <input
                value={audience}
                onChange={(e) => onAudienceChange(e.target.value)}
                placeholder="e.g. students, developers, new parents"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function NewProjectForm() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0].value);
  const [platform, setPlatform] = useState(PLATFORMS[0].value);
  const [audience, setAudience] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = description.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: trimmed,
          aspectRatio,
          platform,
          audience: audience.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { project } = await res.json();

      // Seed the chat with what they just typed so they land straight into
      // the conversation instead of retyping their idea.
      await fetch(`/api/projects/${project.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      }).catch(() => {});

      router.push(`/app/projects/${project.id}`);
    } catch {
      setError("Couldn't create project. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col rounded-2xl border border-border bg-surface-raised"
    >
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe the kind of video you want to create…"
        rows={4}
        autoFocus
        className="w-full resize-none bg-transparent px-6 pt-6 pb-2 text-base text-text-primary placeholder:text-text-tertiary focus:outline-none"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-4 pt-2">
        <div className="flex items-center gap-2">
          <span
            title="Krispy creates short-form videos"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-hover text-text-primary"
          >
            <Clapperboard size={16} />
          </span>
          <SettingsPopover
            aspectRatio={aspectRatio}
            onAspectRatioChange={setAspectRatio}
            platform={platform}
            onPlatformChange={setPlatform}
            audience={audience}
            onAudienceChange={setAudience}
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !description.trim()}
          className="flex shrink-0 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          <Sparkles size={15} />
          {submitting ? "Starting…" : "Start project"}
        </button>
      </div>

      {error ? (
        <p className="px-6 pb-4 text-xs text-danger">{error}</p>
      ) : null}
    </form>
  );
}
