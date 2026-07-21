"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";

// There's no real chat backend yet, so this doesn't pretend to be a live
// chat — it opens a small panel that routes straight to email, same
// honesty pattern as the "coming soon" stubs elsewhere (Settings > Support,
// PricingCta).
export function SupportChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-30">
      {open ? (
        <div className="animate-dropdown-in-down mb-3 w-72 overflow-hidden rounded-2xl border border-white/10 bg-black/80 p-4 backdrop-blur-md">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-white">Need a hand?</p>
              <p className="mt-1 text-xs leading-relaxed text-white/60">
                Live chat is on the way — for now, email goes straight to the
                team and we&apos;ll get back to you.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="shrink-0 text-white/50 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
          <a
            href="mailto:support@krispy.app"
            className="mt-3 flex items-center justify-center rounded-full bg-white px-4 py-2 text-xs font-medium text-black"
          >
            Email support@krispy.app
          </a>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close support chat" : "Open support chat"}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-on-accent shadow-lg transition-colors hover:bg-accent-hover"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </div>
  );
}
