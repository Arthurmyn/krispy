"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, LogOut, Settings, Zap } from "lucide-react";
import { signOutAction } from "@/backend/actions";

export function ProfileMenu({
  userLabel,
  collapsed,
}: {
  userLabel: string;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="animate-dropdown-in absolute bottom-full left-0 z-50 mb-2 w-64 overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-xl">
            <div className="flex items-center gap-3 px-4 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-hover text-sm font-medium text-text-primary">
                {userLabel.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">
                  {userLabel}
                </p>
                <p className="text-xs text-text-tertiary">Free plan</p>
              </div>
            </div>

            <div className="border-t border-border px-2 py-2">
              <button
                type="button"
                onClick={() => {
                  window.alert("Billing is coming soon!");
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              >
                <span className="flex items-center gap-2.5">
                  <Zap size={16} />
                  Upgrade to Pro
                </span>
                <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs text-text-tertiary">
                  Soon
                </span>
              </button>
            </div>

            <div className="border-t border-border px-2 py-2">
              <Link
                href="/app/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              >
                <Settings size={16} />
                Settings
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-hover text-xs font-medium text-text-primary">
            {userLabel.slice(0, 1).toUpperCase()}
          </span>
          {!collapsed ? (
            <span className="truncate">{userLabel}</span>
          ) : null}
        </div>
        {!collapsed ? <ChevronRight size={16} className="shrink-0" /> : null}
      </button>
    </div>
  );
}
