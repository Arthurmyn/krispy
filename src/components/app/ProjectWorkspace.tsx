"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type {
  ChatMessage,
  Project,
  RenderJob,
  Scene,
  Thumbnail,
} from "@/generated/prisma/client";
import { Player } from "@remotion/player";
import { MUSIC_LIBRARY, findMusicTrack, type MusicTrack } from "@/lib/musicLibrary";
import { ShortVideo } from "@/remotion/ShortVideo";
import { FPS, TRANSITION_FRAMES, dimensionsForAspectRatio } from "@/remotion/types";
import { totalDurationInFrames } from "@/remotion/duration";
import {
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Mic,
  Download,
  Loader2,
  Music2,
  Paperclip,
  Pause,
  Play,
  Plus,
  Sparkles,
  SquareDashedMousePointer,
  Tags,
  Trash2,
  X,
} from "lucide-react";

type ProjectWithRelations = Project & {
  scenes: Scene[];
  chatMessages: ChatMessage[];
  renderJobs: RenderJob[];
  thumbnails: Thumbnail[];
};

const PLATFORM_LABELS: Record<string, string> = {
  TIKTOK: "TikTok",
  YOUTUBE_SHORTS: "YouTube",
  INSTAGRAM_REELS: "Instagram Reels",
};

function formatPlatform(platform: string): string {
  return PLATFORM_LABELS[platform] ?? platform;
}

// Matches Sidebar.tsx's STEPS labels — shown as a small badge next to the
// project title so the active section is legible from the page itself, not
// only from which sidebar item happens to be highlighted.
const STEP_LABELS: Record<string, string> = {
  script: "Script",
  scenes: "Image",
  voiceover: "VoiceOver",
  music: "Music",
  render: "Render",
  metadata: "Metadata",
};

export function ProjectWorkspace({
  project: initialProject,
}: {
  project: ProjectWithRelations;
}) {
  const [project, setProject] = useState(initialProject);
  const [messageDraft, setMessageDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [attachedImages, setAttachedImages] = useState<
    { dataUrl: string; base64: string; mimeType: string }[]
  >([]);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const activeStep = searchParams.get("step") ?? "script";
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [project.chatMessages.length]);

  // Style-reference photos: "attach files" reads each one, converts it to a
  // base64 data URL for the preview thumbnail, and keeps that same base64
  // payload around to send to Gemini for vision analysis (see the STYLE
  // stage prompt in src/lib/prompts/stages.ts).
  function attachImages(files: FileList | null) {
    if (!files) return;
    Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
          setAttachedImages((prev) => [
            ...prev,
            { dataUrl, base64, mimeType: file.type },
          ]);
        };
        reader.readAsDataURL(file);
      });
  }

  function removeAttachedImage(index: number) {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if ((!messageDraft.trim() && attachedImages.length === 0) || sending) return;
    setSending(true);
    setChatError(null);
    const images = attachedImages;
    const draft =
      messageDraft.trim() ||
      (images.length ? "Here are some reference photos for the style." : "");
    setMessageDraft("");
    setAttachedImages([]);

    // optimistic append
    setProject((p) => ({
      ...p,
      chatMessages: [
        ...p.chatMessages,
        {
          id: `optimistic-${Date.now()}`,
          projectId: p.id,
          role: "USER",
          content: draft,
          createdAt: new Date(),
        },
      ],
    }));

    try {
      const res = await fetch(`/api/projects/${project.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: draft,
          ...(images.length
            ? {
                images: images.map((img) => ({
                  base64: img.base64,
                  mimeType: img.mimeType,
                })),
              }
            : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setChatError(
          data?.error ?? "Something went wrong sending that message.",
        );
        return;
      }
      setProject(data.project);
    } catch {
      setChatError("Couldn't reach the server. Check your connection.");
    } finally {
      setSending(false);
    }
  }

  const hasScenes = project.scenes.length > 0;
  const allReady = hasScenes && project.scenes.every(
    (s) => s.imageStatus === "READY" && s.voiceoverStatus === "READY",
  );
  const needsApproval = allReady && project.status === "REVIEWING_SCENES";
  const editingNotReady =
    hasScenes &&
    project.status !== "READY_TO_RENDER" &&
    project.status !== "RENDERING" &&
    project.status !== "COMPLETE";
  const latestRender = project.renderJobs[0];

  async function approveScenes() {
    setApproving(true);
    setApproveError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approveScenes: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setApproveError(data?.error ?? "Couldn't approve. Try again.");
        return;
      }
      setProject(data.project);
      if (data.voiceoverReviewError) {
        setApproveError(
          `Approved, but couldn't start the voiceover review in chat: ${data.voiceoverReviewError}`,
        );
      }
    } catch {
      setApproveError("Couldn't reach the server. Check your connection.");
    } finally {
      setApproving(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-8 py-10">
      <header className="flex items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-accent uppercase">
              {STEP_LABELS[activeStep] ?? activeStep}
            </span>
          </div>
          <h1 className="text-lg font-semibold text-text-primary">
            {project.topic ?? project.category}
          </h1>
          <p className="text-xs text-text-tertiary">
            {project.category} ·{" "}
            {project.aspectRatio.replace("RATIO_", "").replace("_", ":")} ·{" "}
            {formatPlatform(project.platform)}
            {project.audience ? ` · ${project.audience}` : ""}
          </p>
        </div>
        <span className="rounded-full bg-surface-hover px-3 py-1 text-xs text-text-secondary">
          {project.status.replaceAll("_", " ").toLowerCase()}
        </span>
      </header>

      {activeStep === "script" ? (
      <section
        id="script"
        className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
      >
        <h2 className="text-xs font-medium tracking-wide text-text-tertiary uppercase">
          Chat with your creative partner
        </h2>
        <div
          className={
            hasScenes
              ? "flex h-96 flex-col overflow-y-auto"
              : "flex h-[60vh] flex-col overflow-y-auto"
          }
        >
          {/* mt-auto (not justify-end on the scroll container) keeps short
              conversations pinned to the bottom without breaking scroll-up
              once messages overflow — flex-end on an overflow container
              clips the overflow at the start in most browsers. */}
          <div className="mt-auto flex flex-col gap-3">
            {project.chatMessages.length === 0 ? (
              <p className="text-sm text-text-tertiary">
                Say what kind of video you want, and we&apos;ll land on a
                topic and script together.
              </p>
            ) : null}
            {project.chatMessages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "USER"
                    ? "max-w-[85%] self-end rounded-2xl bg-accent px-4 py-2.5 text-sm text-on-accent"
                    : "max-w-[85%] self-start rounded-2xl bg-surface-hover px-4 py-3 text-sm text-text-primary"
                }
              >
                <ChatMessageContent text={m.content} />
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>
        {attachedImages.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {attachedImages.map((img, i) => (
              <span key={i} className="relative h-14 w-14 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.dataUrl}
                  alt=""
                  className="h-full w-full rounded-xl object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeAttachedImage(i)}
                  aria-label="Remove image"
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black text-white"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <form
          onSubmit={sendMessage}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            attachImages(e.dataTransfer.files);
          }}
          className="flex items-center gap-2 rounded-full border border-border bg-surface-raised px-2 py-1.5"
        >
          <label
            aria-label="Attach reference photos"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            <Paperclip size={15} />
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                attachImages(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          <input
            value={messageDraft}
            onChange={(e) => setMessageDraft(e.target.value)}
            placeholder={
              attachedImages.length
                ? "Describe the style, or just send the photos…"
                : "e.g. something about surprising space facts"
            }
            className="flex-1 bg-transparent px-2 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || (!messageDraft.trim() && attachedImages.length === 0)}
            aria-label="Send"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {sending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <ArrowUp size={15} strokeWidth={2.5} />
            )}
          </button>
        </form>
        {chatError ? (
          <p className="text-xs text-danger">
            {chatError}
            {chatError.toLowerCase().includes("api key") ? (
              <>
                {" "}
                <Link href="/app/settings" className="underline hover:text-danger">
                  Add it in Settings →
                </Link>
              </>
            ) : null}
          </p>
        ) : null}
      </section>
      ) : null}

      {activeStep === "scenes" ? (
      <section id="scenes" className="flex flex-col gap-3">
        <h2 className="text-xs font-medium tracking-wide text-text-tertiary uppercase">
          Scenes — review images
        </h2>
        {needsApproval ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-text-primary">
              Before you start editing, review all the images above and make
              any changes you need. When everything looks good, approve to
              continue.
            </p>
            <button
              type="button"
              onClick={approveScenes}
              disabled={approving}
              className="flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {approving ? <Loader2 size={14} className="animate-spin" /> : null}
              Approve all
            </button>
          </div>
        ) : null}
        {approveError ? <p className="text-xs text-danger">{approveError}</p> : null}
        {hasScenes ? (
          <SceneGallery
            scenes={project.scenes}
            onUpdate={(updated) =>
              setProject((p) => ({
                ...p,
                scenes: p.scenes.map((s) =>
                  s.id === updated.id ? updated : s,
                ),
              }))
            }
          />
        ) : (
          <p className="rounded-2xl border border-border bg-surface p-4 text-sm text-text-tertiary">
            No scenes yet — finish the script in chat and scenes will show up
            here.
          </p>
        )}
      </section>
      ) : null}

      {activeStep === "voiceover" ? (
      <section id="voiceover" className="flex flex-col gap-3">
        <h2 className="text-xs font-medium tracking-wide text-text-tertiary uppercase">
          Voiceover — review &amp; edit narration
        </h2>
        {hasScenes ? (
          <VoiceoverGallery
            scenes={project.scenes}
            onUpdate={(updated) =>
              setProject((p) => ({
                ...p,
                scenes: p.scenes.map((s) =>
                  s.id === updated.id ? updated : s,
                ),
              }))
            }
          />
        ) : (
          <p className="rounded-2xl border border-border bg-surface p-4 text-sm text-text-tertiary">
            No scenes yet — finish the script in chat and scenes will show up
            here.
          </p>
        )}
      </section>
      ) : null}

      {activeStep === "music" ? (
      <section
        id="music"
        className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
      >
        <h2 className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-text-tertiary uppercase">
          <Music2 size={13} />
          Background music
        </h2>
        {editingNotReady ? (
          <p className="text-xs text-text-tertiary">
            You can set this up now, but approve all your scenes on the
            Image tab first before rendering.
          </p>
        ) : null}
        <MusicPicker
          projectId={project.id}
          selectedTrackId={project.musicTrackId}
          onSelect={(musicTrackId) =>
            setProject((p) => ({ ...p, musicTrackId }))
          }
        />
      </section>
      ) : null}

      {activeStep === "render" ? (
      <section
        id="render"
        className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface p-4"
      >
        <h2 className="text-xs font-medium tracking-wide text-text-tertiary uppercase">
          Render
        </h2>
        {editingNotReady ? (
          <p className="text-xs text-text-tertiary">
            Approve all your scenes on the Image tab first — rendering is
            still available, but scenes may still change until then.
          </p>
        ) : null}
        {hasScenes ? (
          <div className="w-full">
            <RenderEditor
              projectId={project.id}
              scenes={project.scenes}
              musicTrackId={project.musicTrackId}
              aspectRatio={project.aspectRatio}
              onUpdate={(scenes) => setProject((p) => ({ ...p, scenes }))}
            />
          </div>
        ) : null}
        <RenderPanel
          projectId={project.id}
          allReady={allReady}
          latestRender={latestRender}
        />
      </section>
      ) : null}

      {activeStep === "metadata" ? (
      <section
        id="metadata"
        className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
      >
        <h2 className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-text-tertiary uppercase">
          <Tags size={13} />
          Metadata — titles, description, tags, thumbnails
        </h2>
        <MetadataPanel
          project={project}
          onUpdate={(updated) => setProject(updated)}
        />
      </section>
      ) : null}
    </main>
  );
}

// Titles/description/tags are plain text the user can copy; thumbnails are
// a small image gallery reusing the same generate-per-card pattern as
// SceneGallery, just without the reference-image/edit machinery scenes have.
function MetadataPanel({
  project,
  onUpdate,
}: {
  project: ProjectWithRelations;
  onUpdate: (project: ProjectWithRelations) => void;
}) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyThumbnailId, setBusyThumbnailId] = useState<string | null>(null);

  const hasMetadata =
    project.suggestedTitles.length > 0 || Boolean(project.description) || project.tags.length > 0;

  async function generateMetadata() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/metadata`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Couldn't generate metadata. Try again.");
        return;
      }
      onUpdate(data.project);
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setStarting(false);
    }
  }

  async function generateThumbnail(thumbnailId: string) {
    setBusyThumbnailId(thumbnailId);
    setError(null);
    try {
      const res = await fetch(`/api/thumbnails/${thumbnailId}/image`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Couldn't generate the thumbnail. Try again.");
        return;
      }
      onUpdate({
        ...project,
        thumbnails: project.thumbnails.map((t) =>
          t.id === thumbnailId ? data.thumbnail : t,
        ),
      });
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setBusyThumbnailId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!hasMetadata ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-text-tertiary">
            Ask the assistant to propose titles, a description, tags, and thumbnail concepts for
            this video.
          </p>
          <button
            type="button"
            onClick={generateMetadata}
            disabled={starting}
            className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {starting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Generate metadata
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-text-tertiary">Titles</h3>
            {project.suggestedTitles.map((title, i) => (
              <p
                key={i}
                className="rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm text-text-primary"
              >
                {title}
              </p>
            ))}
          </div>
          {project.description ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-medium text-text-tertiary">Description</h3>
              <p className="whitespace-pre-wrap rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm text-text-primary">
                {project.description}
              </p>
            </div>
          ) : null}
          {project.tags.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-medium text-text-tertiary">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {project.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-surface-hover px-2.5 py-1 text-xs text-text-secondary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {project.thumbnails.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-medium text-text-tertiary">Thumbnails</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {project.thumbnails.map((thumb) => (
                  <div
                    key={thumb.id}
                    className="flex flex-col gap-2 rounded-2xl border border-border bg-surface-hover p-2"
                  >
                    <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-black/30">
                      {thumb.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-text-tertiary">
                          <ImageIcon size={18} />
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => generateThumbnail(thumb.id)}
                      disabled={busyThumbnailId === thumb.id}
                      className="flex items-center justify-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50"
                    >
                      {busyThumbnailId === thumb.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Sparkles size={12} />
                      )}
                      {thumb.imageUrl ? "Regenerate" : "Generate"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <button
            type="button"
            onClick={generateMetadata}
            disabled={starting}
            className="flex w-fit items-center gap-1.5 rounded-full bg-surface-hover px-4 py-2 text-xs text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50"
          >
            {starting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Regenerate
          </button>
        </>
      )}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

// Gallery-style scene review, adapted from Google Flow's asset grid: a dense
// grid of thumbnails you click to select, plus one floating prompt bar for
// whichever scene is selected — instead of a full prompt/actions block
// repeated under every single card.

// Template options for now — only Gemini is actually wired up in
// src/lib/providers.ts, so picking anything else here doesn't change what
// runs yet. More providers get wired in later; this just gets the picker UI
// in place first.
const IMAGE_MODEL_OPTIONS = [
  { id: "gemini-3-pro-image", label: "Gemini 3 Pro Image" },
  { id: "nano-banana-pro", label: "Nano Banana Pro" },
  { id: "imagen-4", label: "Imagen 4" },
] as const;

// Lightweight formatting for chat text — no markdown library needed for
// just this. The model often emits "**Label**" markers as bold headers
// without a preceding line break (e.g. "...ending. **Scene 2** — Voiceover:
// ..."), which HTML collapses into one dense paragraph. Forcing a paragraph
// break before every bold marker (other than one at the very start) turns
// that into separated, readable blocks.
function ChatMessageContent({ text }: { text: string }) {
  const normalized = text.replace(
    /[ \t]*(\*\*[^*]+\*\*)/g,
    (match, bold: string, offset: number) =>
      offset === 0 ? bold : `\n\n${bold}`,
  );

  return (
    <div className="flex flex-col gap-2.5">
      {normalized
        .split(/\n{2,}/)
        .filter((p) => p.trim())
        .map((paragraph, i) => (
          <p key={i} className="whitespace-pre-wrap leading-relaxed">
            {paragraph.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={j} className="font-semibold">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                <span key={j}>{part}</span>
              ),
            )}
          </p>
        ))}
    </div>
  );
}

function SceneGallery({
  scenes,
  onUpdate,
}: {
  scenes: Scene[];
  onUpdate: (scene: Scene) => void;
}) {
  const sorted = [...scenes].sort((a, b) => a.order - b.order);
  const [selectedId, setSelectedId] = useState<string | null>(
    sorted[0]?.id ?? null,
  );
  const [prompt, setPrompt] = useState(sorted[0]?.imagePrompt ?? "");
  const [promptSceneId, setPromptSceneId] = useState(sorted[0]?.id ?? null);
  const [busy, setBusy] = useState<"image" | null>(null);
  const [referenceImage, setReferenceImage] = useState<{
    dataUrl: string;
    base64: string;
    mimeType: string;
  } | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [modelId, setModelId] = useState<string>(IMAGE_MODEL_OPTIONS[0].id);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [imageActionError, setImageActionError] = useState<string | null>(null);
  const [editorSceneId, setEditorSceneId] = useState<string | null>(null);

  const selected = sorted.find((s) => s.id === selectedId) ?? null;
  const selectedModel =
    IMAGE_MODEL_OPTIONS.find((m) => m.id === modelId) ?? IMAGE_MODEL_OPTIONS[0];

  // Without this, dropping a file anywhere outside the card (easy to miss,
  // since the card floats over the grid) makes the browser navigate away to
  // open the image as a page instead of doing nothing.
  useEffect(() => {
    const preventDefault = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", preventDefault);
    window.addEventListener("drop", preventDefault);
    return () => {
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", preventDefault);
    };
  }, []);

  // Reset the prompt draft (and any attached reference image) when the
  // selected scene changes — adjusted during render (React's documented
  // pattern for this), not in an effect, so it doesn't trigger an extra
  // render pass.
  if (selected && selected.id !== promptSceneId) {
    setPromptSceneId(selected.id);
    setPrompt(selected.imagePrompt ?? "");
    setReferenceImage(null);
    setImageActionError(null);
  }

  function attachReferenceImage(files: FileList | null) {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      setReferenceImage({ dataUrl, base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  }

  // Dragging one of the scene thumbnails itself (not a file from outside)
  // into the bar — browsers drag <img> elements natively and put the src in
  // "text/uri-list"/"text/plain", so this fetches it back and re-encodes it
  // the same way a dropped file would be.
  async function attachReferenceImageFromUrl(url: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
        setReferenceImage({ dataUrl, base64, mimeType: blob.type || "image/png" });
      };
      reader.readAsDataURL(blob);
    } catch {
      // Cross-origin image without CORS headers, etc. — nothing to attach.
    }
  }

  async function generateImage() {
    if (!selected) return;
    setBusy("image");
    setImageActionError(null);
    try {
      const res = await fetch(`/api/scenes/${selected.id}/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          ...(referenceImage
            ? {
                referenceImageBase64: referenceImage.base64,
                referenceImageMimeType: referenceImage.mimeType,
              }
            : {}),
        }),
      });
      if (res.ok) {
        onUpdate((await res.json()).scene);
        setReferenceImage(null);
      } else {
        const data = await res.json().catch(() => null);
        setImageActionError(data?.error ?? "Couldn't generate the image. Try again.");
      }
    } catch {
      setImageActionError("Couldn't reach the server. Check your connection.");
    } finally {
      setBusy(null);
    }
  }

  const thumbnail = referenceImage?.dataUrl ?? selected?.imageUrl ?? null;

  return (
    <div className="relative flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 pb-40 sm:grid-cols-3 lg:grid-cols-4">
        {sorted.map((scene, index) => (
          <SceneTile
            key={scene.id}
            scene={scene}
            index={index}
            selected={scene.id === selectedId}
            onSelect={() => setSelectedId(scene.id)}
            onOpenEditor={
              scene.imageUrl ? () => setEditorSceneId(scene.id) : undefined
            }
          />
        ))}
      </div>

      {/* Pinned to the bottom of the viewport, Google-Flow-style, floating
          on top of the grid — not sticky-in-flow, so it stays put regardless
          of scroll position. pb-40 above keeps the grid's last row clear of
          it instead of being permanently hidden underneath. The lg:pl-56
          offset roughly matches the expanded sidebar width so this centers
          on the content area rather than the full browser window. */}
      {selected ? (
        <div className="fixed inset-x-0 bottom-6 z-20 flex justify-center px-6 lg:pl-56">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingOver(false);
              if (e.dataTransfer.files.length > 0) {
                attachReferenceImage(e.dataTransfer.files);
                return;
              }
              const url =
                e.dataTransfer.getData("text/uri-list") ||
                e.dataTransfer.getData("text/plain");
              if (url) attachReferenceImageFromUrl(url);
            }}
            className={`relative w-full max-w-2xl rounded-3xl border p-5 pt-9 shadow-2xl backdrop-blur transition-colors ${
              isDraggingOver
                ? "border-accent bg-accent/10"
                : "border-border bg-surface-raised/95"
            }`}
          >
            <div className="group/thumb absolute -top-6 left-2">
              {/* Bigger preview, appears above the thumbnail on hover — same
                  aspect ratio as the scene tiles themselves, just smaller,
                  not cropped into an arbitrary fixed box. Centered on the X
                  below it (left-1/2 -translate-x-1/2), not left-aligned. */}
              {thumbnail ? (
                <div className="pointer-events-none absolute bottom-full left-1/2 mb-3 w-28 -translate-x-1/2 opacity-0 transition-opacity group-hover/thumb:opacity-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbnail}
                    alt=""
                    className="aspect-[9/16] w-full rounded-2xl border border-border object-cover shadow-2xl"
                  />
                </div>
              ) : null}

              <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border-[3px] border-app bg-surface-hover shadow-lg">
                {thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnail}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon size={18} className="text-text-tertiary" />
                )}
                {referenceImage ? (
                  <button
                    type="button"
                    onClick={() => setReferenceImage(null)}
                    aria-label="Remove attached image"
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100"
                  >
                    <X size={18} className="text-white" strokeWidth={2.5} />
                  </button>
                ) : null}
              </div>
            </div>

            {/* Clears whatever's attached in the bar right now (a dropped
                reference image) — it never touches the scene's actual saved
                image in the database. Deleting the real image is a
                separate, more deliberate action, not this X. */}
            <button
              type="button"
              onClick={() => setReferenceImage(null)}
              disabled={!referenceImage}
              aria-label="Remove attached image"
              className="absolute right-4 top-4 text-text-tertiary transition-colors hover:text-text-primary disabled:opacity-30"
            >
              <X size={16} />
            </button>

            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                referenceImage
                  ? "What should change in this image?"
                  : "What do you want to change?"
              }
              className="w-full bg-transparent py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
            />

            <div className="mt-3 flex items-center justify-between gap-2">
              <label
                aria-label="Attach a reference image"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border text-text-tertiary transition-colors hover:text-text-primary"
              >
                <Plus size={16} />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => attachReferenceImage(e.target.files)}
                />
              </label>
              <div className="flex items-center gap-2">
                <div className="relative">
                  {modelMenuOpen ? (
                    <>
                      <button
                        type="button"
                        aria-label="Close model picker"
                        onClick={() => setModelMenuOpen(false)}
                        className="fixed inset-0 z-40 cursor-default"
                      />
                      <div className="animate-dropdown-in absolute bottom-full right-0 z-50 mb-2 w-56 overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-xl">
                        {IMAGE_MODEL_OPTIONS.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              setModelId(option.id);
                              setModelMenuOpen(false);
                            }}
                            className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                          >
                            {option.label}
                            {option.id === modelId ? (
                              <Check size={14} className="text-accent" />
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setModelMenuOpen((o) => !o)}
                    className="flex h-9 items-center gap-1.5 rounded-full bg-surface-hover px-3.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
                  >
                    <Sparkles size={12} />
                    {selectedModel.label}
                    <ChevronDown size={12} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={generateImage}
                  disabled={busy !== null}
                  aria-label={selected.imageUrl ? "Regenerate image" : "Generate image"}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
                >
                  {busy === "image" ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <ArrowUp size={15} strokeWidth={2.5} />
                  )}
                </button>
              </div>
            </div>
            {imageActionError ? (
              <p className="mt-2 text-xs text-danger">{imageActionError}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {editorSceneId ? (
        <SceneEditorModal
          scenes={sorted}
          initialSceneId={editorSceneId}
          onClose={() => setEditorSceneId(null)}
          onUpdate={onUpdate}
        />
      ) : null}
    </div>
  );
}

function SceneTile({
  scene,
  index,
  selected,
  onSelect,
  onOpenEditor,
}: {
  scene: Scene;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onOpenEditor?: () => void;
}) {
  return (
    // A plain div, not a <button> — dragging content nested inside a real
    // <button> is unreliable across browsers (the button's own press
    // handling tends to swallow the native drag gesture), and this tile
    // needs to be draggable as a whole to pick it up into the prompt bar.
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        onSelect();
        onOpenEditor?.();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
          onOpenEditor?.();
        }
      }}
      draggable={Boolean(scene.imageUrl)}
      onDragStart={(e) => {
        if (!scene.imageUrl) return;
        // So it can be picked up and dropped into the prompt bar to use as
        // a reference image — see SceneGallery's onDrop.
        e.dataTransfer.setData("text/uri-list", scene.imageUrl);
        e.dataTransfer.setData("text/plain", scene.imageUrl);
        e.dataTransfer.effectAllowed = "copy";
      }}
      className={`group relative aspect-[9/16] cursor-pointer overflow-hidden rounded-2xl border text-left transition-colors ${
        scene.imageUrl ? "active:cursor-grabbing" : ""
      } ${
        selected
          ? "border-accent"
          : "border-border hover:border-text-tertiary"
      } bg-surface-hover`}
    >
      {scene.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={scene.imageUrl}
          alt=""
          draggable={false}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-text-tertiary">
          <ImageIcon size={16} className="mr-1.5 shrink-0" />
          No image yet
        </span>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 transition-opacity group-hover:opacity-100" />
      <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-[11px] font-medium text-white backdrop-blur">
        {index + 1}
      </span>
      {scene.voiceoverUrl ? (
        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur">
          <Mic size={12} />
        </span>
      ) : null}
      <p className="absolute inset-x-2 bottom-2 line-clamp-2 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
        {scene.script}
      </p>
    </div>
  );
}

// Same grid-select + floating-bar pattern as the Image tab, but for
// narration text: select a scene, edit its voiceover line (defaults to the
// script text), generate or regenerate just that line's audio.
function VoiceoverGallery({
  scenes,
  onUpdate,
}: {
  scenes: Scene[];
  onUpdate: (scene: Scene) => void;
}) {
  const sorted = [...scenes].sort((a, b) => a.order - b.order);
  const [selectedId, setSelectedId] = useState<string | null>(
    sorted[0]?.id ?? null,
  );
  const [text, setText] = useState(
    sorted[0]?.voiceoverText ?? sorted[0]?.script ?? "",
  );
  const [textSceneId, setTextSceneId] = useState(sorted[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Voice parameters — applied to whichever scene is generated next. Gemini
  // ignores elevenLabsSettings; ElevenLabs ignores nothing here but ships
  // sane defaults (its own API defaults) if left blank.
  const [voiceProvider, setVoiceProvider] = useState<"GEMINI" | "ELEVENLABS">("GEMINI");
  const [voiceId, setVoiceId] = useState("");
  const [stability, setStability] = useState(0.5);
  const [similarityBoost, setSimilarityBoost] = useState(0.75);
  const [styleExaggeration, setStyleExaggeration] = useState(0);
  const [useSpeakerBoost, setUseSpeakerBoost] = useState(true);
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
  const providerChangedManually = useRef(false);

  // Default to ElevenLabs when it's connected — a separate quota from
  // Gemini's, so narration doesn't compete with chat/image generation for
  // the same daily free-tier cap. Only applies before the user picks a
  // provider themselves.
  useEffect(() => {
    fetch("/api/settings/api-keys")
      .then((res) => res.json())
      .then((data: { keys: { provider: string }[] }) => {
        if (
          !providerChangedManually.current &&
          data.keys.some((k) => k.provider === "ELEVENLABS")
        ) {
          setVoiceProvider("ELEVENLABS");
        }
      })
      .catch(() => {});
  }, []);

  const selected = sorted.find((s) => s.id === selectedId) ?? null;

  if (selected && selected.id !== textSceneId) {
    setTextSceneId(selected.id);
    setText(selected.voiceoverText ?? selected.script);
    setError(null);
  }

  useEffect(() => {
    return () => audioRef.current?.pause();
  }, []);

  function togglePlay(scene: Scene) {
    if (!scene.voiceoverUrl) return;
    if (playingId === scene.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(scene.voiceoverUrl);
    audio.addEventListener("ended", () => setPlayingId(null));
    audio.addEventListener("error", () => setPlayingId(null));
    audio.play().catch(() => setPlayingId(null));
    audioRef.current = audio;
    setPlayingId(scene.id);
  }

  async function generateVoiceover() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/scenes/${selected.id}/voiceover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          provider: voiceProvider,
          voiceId: voiceId.trim() || undefined,
          ...(voiceProvider === "ELEVENLABS"
            ? {
                elevenLabsSettings: {
                  stability,
                  similarityBoost,
                  style: styleExaggeration,
                  useSpeakerBoost,
                },
              }
            : {}),
        }),
      });
      if (res.ok) {
        onUpdate((await res.json()).scene);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Couldn't generate the voiceover. Try again.");
      }
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 pb-40 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((scene, index) => (
          <VoiceoverTile
            key={scene.id}
            scene={scene}
            index={index}
            selected={scene.id === selectedId}
            playing={playingId === scene.id}
            onSelect={() => setSelectedId(scene.id)}
            onTogglePlay={() => togglePlay(scene)}
          />
        ))}
      </div>

      {/* Same fixed/pinned floating-card pattern as the Image tab's bar. */}
      {selected ? (
        <div className="fixed inset-x-0 bottom-6 z-20 flex justify-center px-6 lg:pl-56">
          <div className="relative w-full max-w-2xl rounded-3xl border border-border bg-surface-raised/95 p-5 shadow-2xl backdrop-blur">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="Close"
              className="absolute right-4 top-4 text-text-tertiary transition-colors hover:text-text-primary"
            >
              <X size={16} />
            </button>
            <span className="text-xs font-medium text-text-secondary">
              Scene {sorted.indexOf(selected) + 1} of {sorted.length}
            </span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="mt-2 w-full resize-none rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
              placeholder="Voiceover / subtitle text for this scene…"
            />

            <details
              open={voiceSettingsOpen}
              onToggle={(e) => setVoiceSettingsOpen(e.currentTarget.open)}
              className="mt-2 rounded-xl border border-border bg-surface px-3 py-2"
            >
              <summary className="cursor-pointer select-none text-xs font-medium text-text-secondary">
                Voice settings
              </summary>
              <div className="mt-2 flex flex-col gap-2">
                <div className="flex items-center gap-1 rounded-full border border-border bg-surface-raised p-1">
                  {(["GEMINI", "ELEVENLABS"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        providerChangedManually.current = true;
                        setVoiceProvider(p);
                      }}
                      className={
                        p === voiceProvider
                          ? "flex-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-on-accent"
                          : "flex-1 rounded-full px-2.5 py-1 text-[11px] text-text-secondary hover:text-text-primary"
                      }
                    >
                      {p === "GEMINI" ? "Gemini" : "ElevenLabs"}
                    </button>
                  ))}
                </div>
                <input
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value)}
                  placeholder={
                    voiceProvider === "GEMINI"
                      ? "Voice name (optional, e.g. Kore, Puck)…"
                      : "Voice ID (optional, defaults to Rachel)…"
                  }
                  className="w-full rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none"
                />
                {voiceProvider === "ELEVENLABS" ? (
                  <div className="flex flex-col gap-2">
                    <label className="flex flex-col gap-1 text-[11px] text-text-tertiary">
                      Stability ({stability.toFixed(2)})
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={stability}
                        onChange={(e) => setStability(Number(e.target.value))}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-[11px] text-text-tertiary">
                      Similarity boost ({similarityBoost.toFixed(2)})
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={similarityBoost}
                        onChange={(e) => setSimilarityBoost(Number(e.target.value))}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-[11px] text-text-tertiary">
                      Style exaggeration ({styleExaggeration.toFixed(2)})
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={styleExaggeration}
                        onChange={(e) => setStyleExaggeration(Number(e.target.value))}
                      />
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
                      <input
                        type="checkbox"
                        checked={useSpeakerBoost}
                        onChange={(e) => setUseSpeakerBoost(e.target.checked)}
                      />
                      Speaker boost
                    </label>
                  </div>
                ) : null}
              </div>
            </details>

            <div className="mt-3 flex items-center justify-between gap-2">
              {selected.voiceoverUrl ? (
                <button
                  type="button"
                  onClick={() => togglePlay(selected)}
                  className="flex items-center gap-1.5 rounded-full bg-surface-hover px-3.5 py-2 text-xs text-text-secondary transition-colors hover:text-text-primary"
                >
                  {playingId === selected.id ? (
                    <Pause size={13} />
                  ) : (
                    <Play size={13} className="ml-0.5" />
                  )}
                  Preview
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={generateVoiceover}
                disabled={busy || !text.trim()}
                className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Mic size={14} />
                )}
                {selected.voiceoverUrl ? "Regenerate voiceover" : "Generate voiceover"}
              </button>
            </div>
            {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function VoiceoverTile({
  scene,
  index,
  selected,
  playing,
  onSelect,
  onTogglePlay,
}: {
  scene: Scene;
  index: number;
  selected: boolean;
  playing: boolean;
  onSelect: () => void;
  onTogglePlay: () => void;
}) {
  const text = scene.voiceoverText ?? scene.script;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`flex cursor-pointer flex-col gap-2 rounded-2xl border p-3 transition-colors ${
        selected ? "border-accent" : "border-border hover:border-text-tertiary"
      } bg-surface-hover`}
    >
      <div className="flex items-center justify-between">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/30 text-[11px] font-medium text-text-primary">
          {index + 1}
        </span>
        {scene.voiceoverUrl ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePlay();
            }}
            aria-label={playing ? "Pause preview" : "Play preview"}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-text-secondary transition-colors hover:text-text-primary"
          >
            {playing ? (
              <Pause size={11} />
            ) : (
              <Play size={11} className="ml-0.5" />
            )}
          </button>
        ) : (
          <span
            title="No voiceover yet"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-text-tertiary"
          >
            <Mic size={11} />
          </span>
        )}
      </div>
      <p className="line-clamp-3 text-xs text-text-secondary">{text}</p>
    </div>
  );
}

// Full-screen editor, Google-Flow-style: opens on clicking a scene that
// already has an image. The "select area" tool draws a rectangle over the
// image and folds its rough position into the prompt text as a plain-
// language hint ("only change the region around X%–Y%…") — the Gemini image
// API doesn't take a real pixel mask through this endpoint, so this is a
// best-effort nudge, not pixel-accurate inpainting.
function SceneEditorModal({
  scenes,
  initialSceneId,
  onClose,
  onUpdate,
}: {
  scenes: Scene[];
  initialSceneId: string;
  onClose: () => void;
  onUpdate: (scene: Scene) => void;
}) {
  const [activeId, setActiveId] = useState(initialSceneId);
  const active = scenes.find((s) => s.id === activeId) ?? scenes[0];
  const activeIndex = scenes.findIndex((s) => s.id === active.id);

  const [prompt, setPrompt] = useState(active.imagePrompt ?? "");
  const [promptSceneId, setPromptSceneId] = useState(active.id);
  const [referenceImage, setReferenceImage] = useState<{
    dataUrl: string;
    base64: string;
    mimeType: string;
  } | null>(null);
  const [busy, setBusy] = useState<"image" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string>(IMAGE_MODEL_OPTIONS[0].id);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selection, setSelection] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const imageBoxRef = useRef<HTMLDivElement>(null);

  const selectedModel =
    IMAGE_MODEL_OPTIONS.find((m) => m.id === modelId) ?? IMAGE_MODEL_OPTIONS[0];

  if (active.id !== promptSceneId) {
    setPromptSceneId(active.id);
    setPrompt(active.imagePrompt ?? "");
    setReferenceImage(null);
    setError(null);
    setSelection(null);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function attachReferenceImage(files: FileList | null) {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      setReferenceImage({ dataUrl, base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  }

  async function attachReferenceImageFromUrl(url: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
        setReferenceImage({ dataUrl, base64, mimeType: blob.type || "image/png" });
      };
      reader.readAsDataURL(blob);
    } catch {
      // Cross-origin image without CORS headers, etc. — nothing to attach.
    }
  }

  function pointFromEvent(e: React.MouseEvent): { x: number; y: number } | null {
    const box = imageBoxRef.current;
    if (!box) return null;
    const rect = box.getBoundingClientRect();
    return {
      x: Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1),
      y: Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1),
    };
  }

  function handleImageMouseDown(e: React.MouseEvent) {
    if (!selectMode || !active.imageUrl) return;
    const p = pointFromEvent(e);
    if (!p) return;
    dragStart.current = p;
    setSelection({ x: p.x, y: p.y, w: 0, h: 0 });
  }

  function handleImageMouseMove(e: React.MouseEvent) {
    if (!selectMode || !dragStart.current) return;
    const p = pointFromEvent(e);
    if (!p) return;
    const { x: x0, y: y0 } = dragStart.current;
    setSelection({
      x: Math.min(x0, p.x),
      y: Math.min(y0, p.y),
      w: Math.abs(p.x - x0),
      h: Math.abs(p.y - y0),
    });
  }

  function handleImageMouseUp() {
    dragStart.current = null;
  }

  async function generateImage() {
    setBusy("image");
    setError(null);
    try {
      let finalPrompt = prompt;
      if (selection && selection.w > 0.02 && selection.h > 0.02) {
        const region =
          `Only change the selected region of the image — roughly ` +
          `${Math.round(selection.x * 100)}% to ${Math.round((selection.x + selection.w) * 100)}% ` +
          `across and ${Math.round(selection.y * 100)}% to ${Math.round((selection.y + selection.h) * 100)}% ` +
          `down the frame. Leave everything outside that region as it is. `;
        finalPrompt = region + prompt;
      }
      const res = await fetch(`/api/scenes/${active.id}/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt,
          ...(referenceImage
            ? {
                referenceImageBase64: referenceImage.base64,
                referenceImageMimeType: referenceImage.mimeType,
              }
            : {}),
        }),
      });
      if (res.ok) {
        onUpdate((await res.json()).scene);
        setReferenceImage(null);
        setSelection(null);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Couldn't generate the image. Try again.");
      }
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteImage() {
    if (!active.imageUrl) return;
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(`/api/scenes/${active.id}/image`, {
        method: "DELETE",
      });
      if (res.ok) {
        onUpdate((await res.json()).scene);
        onClose();
      } else {
        setError("Couldn't delete the image. Try again.");
      }
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-app">
      <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="truncate text-sm font-medium text-text-primary">
            Scene {activeIndex + 1}
          </span>
        </div>

        <div className="hidden flex-1 items-center justify-center gap-2 overflow-x-auto sm:flex">
          {scenes.map((scene, i) => (
            <button
              key={scene.id}
              type="button"
              onClick={() => setActiveId(scene.id)}
              className={`h-10 w-10 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                scene.id === active.id
                  ? "border-accent"
                  : "border-transparent opacity-50 hover:opacity-100"
              }`}
            >
              {scene.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={scene.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-surface-hover text-[10px] text-text-tertiary">
                  {i + 1}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {active.imageUrl ? (
            <a
              href={active.imageUrl}
              download
              aria-label="Download image"
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              <Download size={17} />
            </a>
          ) : null}
          <button
            type="button"
            onClick={deleteImage}
            disabled={!active.imageUrl || busy !== null}
            aria-label="Delete image"
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-hover hover:text-danger disabled:opacity-30"
          >
            {busy === "delete" ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Trash2 size={17} />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-2 rounded-full bg-surface-hover px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-raised"
          >
            Done
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-6 py-6">
        {active.imageUrl ? (
          <div className="absolute left-6 top-6 z-10 flex flex-col gap-1 rounded-2xl border border-border bg-surface p-1.5">
            <button
              type="button"
              onClick={() => {
                setSelectMode((s) => !s);
                setSelection(null);
              }}
              aria-label="Select an area to edit"
              aria-pressed={selectMode}
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                selectMode
                  ? "bg-accent text-on-accent"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              }`}
            >
              <SquareDashedMousePointer size={17} />
            </button>
          </div>
        ) : null}

        <div
          ref={imageBoxRef}
          onMouseDown={handleImageMouseDown}
          onMouseMove={handleImageMouseMove}
          onMouseUp={handleImageMouseUp}
          onMouseLeave={handleImageMouseUp}
          className={`relative ${selectMode ? "cursor-crosshair" : ""}`}
        >
          {active.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={active.imageUrl}
              alt=""
              draggable={false}
              className="max-h-[calc(100vh-260px)] max-w-full select-none rounded-2xl object-contain"
            />
          ) : (
            <div className="flex aspect-[9/16] max-h-[calc(100vh-260px)] w-72 items-center justify-center rounded-2xl border border-border bg-surface-hover px-8 text-center text-sm text-text-tertiary">
              No image yet — generate one below.
            </div>
          )}

          {selection ? (
            <div
              className="pointer-events-none absolute border-2 border-accent bg-accent/10"
              style={{
                left: `${selection.x * 100}%`,
                top: `${selection.y * 100}%`,
                width: `${selection.w * 100}%`,
                height: `${selection.h * 100}%`,
              }}
            />
          ) : null}
        </div>
      </div>

      <div className="flex justify-center px-6 pb-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingOver(false);
            if (e.dataTransfer.files.length > 0) {
              attachReferenceImage(e.dataTransfer.files);
              return;
            }
            const url =
              e.dataTransfer.getData("text/uri-list") ||
              e.dataTransfer.getData("text/plain");
            if (url) attachReferenceImageFromUrl(url);
          }}
          className={`w-full max-w-2xl rounded-3xl border p-5 shadow-2xl transition-colors ${
            isDraggingOver
              ? "border-accent bg-accent/10"
              : "border-border bg-surface-raised"
          }`}
        >
          {selection && selection.w > 0.02 && selection.h > 0.02 ? (
            <div className="mb-2 flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs text-accent">
                <SquareDashedMousePointer size={12} />
                Editing selected area
              </span>
              <button
                type="button"
                onClick={() => setSelection(null)}
                className="text-xs text-text-tertiary hover:text-text-primary"
              >
                Clear
              </button>
            </div>
          ) : null}

          <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-2 py-1.5">
            {referenceImage ? (
              <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={referenceImage.dataUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setReferenceImage(null)}
                  aria-label="Remove attached image"
                  className="absolute inset-0 flex items-center justify-center bg-black/50 text-white"
                >
                  <X size={12} />
                </button>
              </span>
            ) : (
              <label
                aria-label="Attach a reference image"
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border text-text-tertiary transition-colors hover:text-text-primary"
              >
                <Plus size={15} />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => attachReferenceImage(e.target.files)}
                />
              </label>
            )}
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                selection && selection.w > 0.02 && selection.h > 0.02
                  ? "What should change in the selected area?"
                  : "What do you want to change?"
              }
              className="flex-1 bg-transparent px-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
            />
            <div className="relative">
              {modelMenuOpen ? (
                <>
                  <button
                    type="button"
                    aria-label="Close model picker"
                    onClick={() => setModelMenuOpen(false)}
                    className="fixed inset-0 z-40 cursor-default"
                  />
                  <div className="animate-dropdown-in absolute bottom-full right-0 z-50 mb-2 w-56 overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-xl">
                    {IMAGE_MODEL_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setModelId(option.id);
                          setModelMenuOpen(false);
                        }}
                        className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                      >
                        {option.label}
                        {option.id === modelId ? (
                          <Check size={14} className="text-accent" />
                        ) : null}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => setModelMenuOpen((o) => !o)}
                className="flex h-9 items-center gap-1.5 rounded-full bg-surface-hover px-3.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
              >
                <Sparkles size={12} />
                {selectedModel.label}
                <ChevronDown size={12} />
              </button>
            </div>
            <button
              type="button"
              onClick={generateImage}
              disabled={busy !== null}
              aria-label={active.imageUrl ? "Regenerate image" : "Generate image"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {busy === "image" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <ArrowUp size={15} strokeWidth={2.5} />
              )}
            </button>
          </div>
          {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

const MOOD_LABELS: Record<MusicTrack["mood"], string> = {
  upbeat: "Upbeat",
  chill: "Chill",
  dramatic: "Dramatic",
  corporate: "Corporate",
  cinematic: "Cinematic",
};

const ALL_MOODS = Array.from(
  new Set(MUSIC_LIBRARY.map((t) => t.mood)),
) as MusicTrack["mood"][];

// Genre tabs at the top of the card switch which tracks are listed below,
// instead of every genre being permanently stacked as its own section.
function MusicPicker({
  projectId,
  selectedTrackId,
  onSelect,
}: {
  projectId: string;
  selectedTrackId: string | null;
  onSelect: (trackId: string | null) => void;
}) {
  const [saving, setSaving] = useState<string | "none" | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [activeMood, setActiveMood] = useState<MusicTrack["mood"]>(
    ALL_MOODS[0],
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => audioRef.current?.pause();
  }, []);

  function togglePlay(track: MusicTrack) {
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(track.url);
    audio.addEventListener("ended", () => setPlayingId(null));
    audio.addEventListener("error", () => setPlayingId(null));
    audio.play().catch(() => setPlayingId(null));
    audioRef.current = audio;
    setPlayingId(track.id);
  }

  async function selectTrack(trackId: string | null) {
    setSaving(trackId ?? "none");
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ musicTrackId: trackId }),
      });
      if (res.ok) onSelect(trackId);
    } finally {
      setSaving(null);
    }
  }

  const tracksForMood = MUSIC_LIBRARY.filter((t) => t.mood === activeMood);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-nowrap items-center gap-1 overflow-x-auto rounded-full border border-border bg-surface p-1">
          {ALL_MOODS.map((mood) => (
            <button
              key={mood}
              type="button"
              onClick={() => setActiveMood(mood)}
              className={
                activeMood === mood
                  ? "whitespace-nowrap rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-on-accent"
                  : "whitespace-nowrap rounded-full px-3 py-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
              }
            >
              {MOOD_LABELS[mood]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => selectTrack(null)}
          disabled={saving !== null}
          className={
            selectedTrackId === null
              ? "shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-on-accent disabled:opacity-50"
              : "shrink-0 rounded-full border border-border px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary disabled:opacity-50"
          }
        >
          {saving === "none" ? "…" : "No music"}
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        {tracksForMood.map((track) => {
          const selected = selectedTrackId === track.id;
          const playing = playingId === track.id;
          return (
            <div
              key={track.id}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${
                selected
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-text-tertiary"
              }`}
            >
              <button
                type="button"
                onClick={() => togglePlay(track)}
                aria-label={playing ? "Pause preview" : "Play preview"}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-hover text-text-secondary transition-colors hover:text-text-primary"
              >
                {playing ? (
                  <Pause size={13} />
                ) : (
                  <Play size={13} className="ml-0.5" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">
                  {track.title}
                </p>
                <p className="truncate text-xs text-text-tertiary">
                  {track.credit}
                </p>
              </div>
              <button
                type="button"
                onClick={() => selectTrack(track.id)}
                disabled={saving !== null}
                className={
                  selected
                    ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent disabled:opacity-50"
                    : "shrink-0 rounded-full border border-border px-3 py-1 text-xs text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50"
                }
              >
                {saving === track.id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : selected ? (
                  <Check size={13} />
                ) : (
                  "Select"
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Live preview (Remotion Player — the same composition the actual render
// uses, so what you see here is what you get) plus manual fixes: reorder
// scenes and nudge each one's duration. Order/duration are the two things
// that are awkward to get right purely through chat, so this is the "if
// something's off, fix it yourself" escape hatch.
function RenderEditor({
  projectId,
  scenes,
  musicTrackId,
  aspectRatio,
  onUpdate,
}: {
  projectId: string;
  scenes: Scene[];
  musicTrackId: string | null;
  aspectRatio: Project["aspectRatio"];
  onUpdate: (scenes: Scene[]) => void;
}) {
  const [localScenes, setLocalScenes] = useState(() =>
    [...scenes].sort((a, b) => a.order - b.order),
  );
  const [syncedScenes, setSyncedScenes] = useState(scenes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sort from the latest `scenes` prop when it changes (e.g. after a
  // save round-trip) — adjusted during render, not in an effect, so it
  // doesn't trigger an extra render pass.
  if (scenes !== syncedScenes) {
    setSyncedScenes(scenes);
    setLocalScenes([...scenes].sort((a, b) => a.order - b.order));
  }

  const ratio: "9:16" | "16:9" | "1:1" =
    aspectRatio === "RATIO_16_9"
      ? "16:9"
      : aspectRatio === "RATIO_1_1"
        ? "1:1"
        : "9:16";
  const { width, height } = dimensionsForAspectRatio(ratio);
  const musicUrl = findMusicTrack(musicTrackId)?.url ?? null;

  const playerScenes = localScenes.map((s) => ({
    id: s.id,
    imageUrl: s.imageUrl ?? "",
    voiceoverUrl: s.voiceoverUrl,
    durationMs: s.durationMs ?? 3000,
    subtitle: s.script,
  }));

  const previewHeight = 480;
  const previewWidth = Math.round((width / height) * previewHeight);

  async function persist(next: Scene[]) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/scenes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenes: next.map((s, i) => ({
            id: s.id,
            order: i,
            durationMs: s.durationMs ?? 3000,
          })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate(data.scenes);
      } else {
        setError("Couldn't save changes. Try again.");
      }
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= localScenes.length) return;
    const next = [...localScenes];
    [next[index], next[target]] = [next[target], next[index]];
    setLocalScenes(next);
    persist(next);
  }

  function updateDuration(index: number, seconds: number) {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    const next = [...localScenes];
    next[index] = { ...next[index], durationMs: Math.round(seconds * 1000) };
    setLocalScenes(next);
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="overflow-hidden rounded-2xl border border-border bg-black"
        style={{ width: previewWidth }}
      >
        <Player
          component={ShortVideo}
          inputProps={{
            scenes: playerScenes,
            aspectRatio: ratio,
            fps: FPS,
            musicUrl,
          }}
          durationInFrames={Math.max(
            1,
            totalDurationInFrames(playerScenes, FPS, TRANSITION_FRAMES),
          )}
          fps={FPS}
          compositionWidth={width}
          compositionHeight={height}
          style={{ width: previewWidth, height: previewHeight }}
          controls
        />
      </div>

      <div className="flex flex-col gap-1.5">
        {localScenes.map((scene, index) => (
          <div
            key={scene.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2"
          >
            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0 || saving}
                aria-label="Move scene earlier"
                className="text-text-tertiary transition-colors hover:text-text-primary disabled:opacity-30"
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === localScenes.length - 1 || saving}
                aria-label="Move scene later"
                className="text-text-tertiary transition-colors hover:text-text-primary disabled:opacity-30"
              >
                <ChevronDown size={14} />
              </button>
            </div>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-xs font-medium text-text-secondary">
              {index + 1}
            </span>
            {scene.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={scene.imageUrl}
                alt=""
                className="h-12 w-8 shrink-0 rounded-md object-cover"
              />
            ) : (
              <div className="h-12 w-8 shrink-0 rounded-md bg-surface-hover" />
            )}
            <p className="min-w-0 flex-1 truncate text-sm text-text-secondary">
              {scene.script}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <input
                type="number"
                min={0.5}
                step={0.1}
                value={((scene.durationMs ?? 3000) / 1000).toFixed(1)}
                onChange={(e) =>
                  updateDuration(index, Number(e.target.value))
                }
                onBlur={() => persist(localScenes)}
                disabled={saving}
                className="w-16 rounded-lg border border-border bg-surface-raised px-2 py-1 text-xs text-text-primary focus:outline-none disabled:opacity-50"
              />
              <span className="text-xs text-text-tertiary">s</span>
            </div>
          </div>
        ))}
      </div>

      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

function RenderPanel({
  projectId,
  allReady,
  latestRender,
}: {
  projectId: string;
  allReady: boolean;
  latestRender: RenderJob | undefined;
}) {
  const [renderJob, setRenderJob] = useState(latestRender);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!renderJob || renderJob.status === "COMPLETE" || renderJob.status === "FAILED") {
      return;
    }
    const interval = setInterval(async () => {
      const res = await fetch(`/api/render-jobs/${renderJob.id}`);
      if (res.ok) {
        const data = await res.json();
        setRenderJob(data.renderJob);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [renderJob]);

  async function startRender() {
    setStarting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/render`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setRenderJob(data.renderJob);
      }
    } finally {
      setStarting(false);
    }
  }

  if (renderJob && renderJob.status === "COMPLETE" && renderJob.outputUrl) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-text-primary">Your video is ready.</p>
        <a
          href={renderJob.outputUrl}
          download
          className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
        >
          <Download size={15} />
          Download MP4
        </a>
      </div>
    );
  }

  if (renderJob && (renderJob.status === "QUEUED" || renderJob.status === "RENDERING")) {
    return (
      <p className="flex items-center gap-2 text-sm text-text-secondary">
        <Loader2 size={14} className="animate-spin" />
        Rendering your video…
      </p>
    );
  }

  if (renderJob && renderJob.status === "FAILED") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-danger">
          Render failed: {renderJob.error}
        </p>
        <button
          onClick={startRender}
          disabled={!allReady || starting}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startRender}
      disabled={!allReady || starting}
      className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
    >
      {allReady
        ? starting
          ? "Starting…"
          : "Assemble video"
        : "Generate every scene's image + voiceover first"}
    </button>
  );
}
