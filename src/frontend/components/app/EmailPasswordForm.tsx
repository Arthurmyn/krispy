"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2, Lock, Mail } from "lucide-react";

// Real email+password sign-in/sign-up, distinct from the dev-only
// email-only form in SignInScreen.tsx. Client component because it needs
// to show inline errors (wrong password, email taken) without a full page
// reload.
export function EmailPasswordForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setError(data?.error ?? "Couldn't create your account.");
          return;
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError(
          mode === "signup"
            ? "Account created, but sign-in failed — try signing in below."
            : "Incorrect email or password.",
        );
        return;
      }
      window.location.href = "/app";
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3">
          <Mail size={15} className="text-text-tertiary" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 bg-transparent py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3">
          <Lock size={15} className="text-text-tertiary" />
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={
              mode === "signup" ? "At least 8 characters" : "Password"
            }
            className="flex-1 bg-transparent py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
          />
        </div>
        {error ? <p className="text-xs text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : null}
          {mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => {
          setMode((m) => (m === "signin" ? "signup" : "signin"));
          setError(null);
        }}
        className="text-center text-xs text-text-tertiary hover:text-text-secondary"
      >
        {mode === "signin"
          ? "No account yet? Create one"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
