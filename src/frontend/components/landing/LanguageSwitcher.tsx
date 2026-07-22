"use client";

import { ChevronDown, Globe } from "lucide-react";

// Only English exists right now (see SettingsTabs.tsx's disabled language
// select) — this is the same "not wired up yet" control, just relocated to
// a persistent bottom-left corner instead of living in the nav row.
export function LanguageSwitcher() {
  return (
    <button
      type="button"
      className="fixed bottom-6 left-6 z-30 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-md transition-colors hover:text-white"
    >
      <Globe size={14} />
      English
      <ChevronDown size={14} />
    </button>
  );
}
