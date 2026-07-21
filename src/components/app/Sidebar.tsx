"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Clapperboard,
  Home,
  Image as ImageIcon,
  KeyRound,
  MessageSquare,
  Mic,
  Music2,
  PanelLeft,
  Plus,
} from "lucide-react";
import { ProfileMenu } from "./ProfileMenu";

export type SidebarProject = {
  id: string;
  title: string;
  status: string;
};

// Mirrors the sections rendered in ProjectWorkspace (ids: #script, #scenes,
// #music, #render) so these are plain in-page anchor jumps, not routes.
const STEPS = [
  { id: "script", label: "Script", icon: MessageSquare },
  { id: "scenes", label: "Image", icon: ImageIcon },
  { id: "voiceover", label: "VoiceOver", icon: Mic },
  { id: "music", label: "Music", icon: Music2 },
  { id: "render", label: "Render", icon: Clapperboard },
] as const;

function NavPill({
  href,
  icon: Icon,
  label,
  active,
  collapsed,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={
        active
          ? "flex items-center gap-3 rounded-2xl bg-surface-hover px-4 py-3 text-sm font-medium text-text-primary"
          : "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
      }
    >
      <Icon size={19} />
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </Link>
  );
}

export function Sidebar({
  userLabel,
  // Not read right now (the unread-vars warning here is expected) — kept so
  // the prop stays wired through AppShell for a future project switcher.
  projects,
  activeProjectId,
}: {
  userLabel: string;
  projects: SidebarProject[];
  activeProjectId?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);

  const isHome = pathname === "/app";
  const isSettings = pathname?.startsWith("/app/settings") ?? false;

  const isProjectPage = Boolean(activeProjectId);
  const activeStep = searchParams.get("step") ?? "script";

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-border bg-surface p-4 transition-[width] duration-200 ${
        collapsed ? "w-20" : "w-56"
      }`}
    >
      <div
        className={`flex items-center px-1 py-1.5 ${collapsed ? "justify-center" : "justify-between"}`}
      >
        {!collapsed ? (
          <Link
            href="/app"
            className="text-lg font-semibold tracking-tight text-text-primary"
          >
            Krispy
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
        >
          <PanelLeft size={15} />
        </button>
      </div>

      <nav className="mt-6 flex flex-col gap-1">
        <NavPill
          href="/app"
          icon={Home}
          label="Home"
          active={isHome}
          collapsed={collapsed}
        />
        <NavPill
          href="/app/settings?tab=api-keys"
          icon={KeyRound}
          label="API keys"
          active={isSettings}
          collapsed={collapsed}
        />
      </nav>

      <div className="mt-8 flex min-h-0 flex-1 flex-col">
        {!collapsed ? (
          <p className="px-4 text-sm text-text-tertiary">Steps</p>
        ) : null}
        <div className="mt-2 flex flex-col gap-1">
          {STEPS.map((step) => {
            // Unlocked for now — all steps are reachable as soon as a
            // project is open, regardless of how far along it is. Each
            // step is its own view (?step=…), not an anchor jump — only the
            // matching section renders in ProjectWorkspace.
            const reachable = isProjectPage;
            const active = reachable && activeStep === step.id;
            const content = (
              <>
                <step.icon size={19} className="shrink-0" />
                {!collapsed ? (
                  <span className="truncate">{step.label}</span>
                ) : null}
              </>
            );

            if (reachable) {
              return (
                <Link
                  key={step.id}
                  href={`/app/projects/${activeProjectId}?step=${step.id}`}
                  title={collapsed ? step.label : undefined}
                  className={
                    active
                      ? "flex items-center gap-3 rounded-2xl bg-surface-hover px-4 py-3 text-sm font-medium text-text-primary"
                      : "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                  }
                >
                  {content}
                </Link>
              );
            }

            return (
              <span
                key={step.id}
                title={
                  isProjectPage
                    ? "Not ready yet"
                    : "Open a project to jump between its steps"
                }
                className="flex cursor-not-allowed items-center gap-3 rounded-2xl px-4 py-3 text-sm text-text-tertiary opacity-50"
              >
                {content}
              </span>
            );
          })}
        </div>
      </div>

      <Link
        href="/app"
        className="flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
      >
        <Plus size={16} strokeWidth={2.5} />
        {!collapsed ? "New video" : null}
      </Link>

      <div className="mt-3">
        <ProfileMenu userLabel={userLabel} collapsed={collapsed} />
      </div>
    </aside>
  );
}
