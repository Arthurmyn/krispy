"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  FileText,
  Globe,
  KeyRound,
  LifeBuoy,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Receipt,
  ShieldCheck,
  User,
  Zap,
} from "lucide-react";
import { signOutAction } from "@/backend/actions";
import { ApiKeysForm } from "./ApiKeysForm";

type Tab = "account" | "api-keys" | "plan" | "support" | "terms";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "account", label: "Account", icon: User },
  { id: "api-keys", label: "API keys", icon: KeyRound },
  { id: "plan", label: "Plan", icon: Zap },
  { id: "support", label: "Support", icon: LifeBuoy },
  { id: "terms", label: "Terms & policies", icon: FileText },
];

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      {children}
    </div>
  );
}

// Google-only accounts have no password yet (hasPassword=false) — same
// form either way, just a different label and whether "current password"
// is required, matching /api/settings/password's own logic.
function PasswordCard({ hasPassword }: { hasPassword: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/settings/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(hasPassword ? { currentPassword } : {}),
          newPassword,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Couldn't update your password.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setSuccess(true);
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-hover text-text-primary">
          <Lock size={16} />
        </span>
        <div>
          <p className="text-sm font-medium text-text-primary">
            {hasPassword ? "Change password" : "Set a password"}
          </p>
          <p className="text-xs text-text-tertiary">
            {hasPassword
              ? "Update the password used to sign in with email."
              : "Add a password so you can also sign in with email, not just Google."}
          </p>
        </div>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-2">
        {hasPassword ? (
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
          />
        ) : null}
        <input
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password (min. 8 characters)"
          className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
        />
        {error ? <p className="text-xs text-danger">{error}</p> : null}
        {success ? (
          <p className="text-xs text-success">Password updated.</p>
        ) : null}
        <button
          type="submit"
          disabled={saving || !newPassword}
          className="flex items-center justify-center gap-2 self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : null}
          {hasPassword ? "Update password" : "Set password"}
        </button>
      </form>
    </div>
  );
}

function SoonRow({
  icon: Icon,
  title,
  subtitle,
  actionLabel,
  message,
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  subtitle: string;
  actionLabel: string;
  message: string;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-hover text-text-primary">
            <Icon size={16} />
          </span>
          <div>
            <p className="text-sm font-medium text-text-primary">{title}</p>
            <p className="text-xs text-text-tertiary">{subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.alert(message)}
          className="shrink-0 rounded-full border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
        >
          {actionLabel}
        </button>
      </div>
    </Card>
  );
}

export function SettingsTabs({
  userEmail,
  userName,
  signInMethod,
  videosThisMonth,
  hasPassword,
}: {
  userEmail: string;
  userName: string | null;
  signInMethod: string;
  videosThisMonth: number;
  hasPassword: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab: Tab = TABS.some((t) => t.id === requestedTab)
    ? (requestedTab as Tab)
    : "account";
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(userName ?? "");
  const [nameInput, setNameInput] = useState(userName ?? "");
  const [saving, setSaving] = useState(false);

  const initial = (name || userEmail).slice(0, 1).toUpperCase();

  async function saveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        setName(trimmed);
        setEditingName(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 sm:flex-row">
      <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto sm:w-56 sm:flex-col sm:overflow-visible">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/app/settings?tab=${t.id}`}
            className={
              tab === t.id
                ? "flex items-center gap-2.5 rounded-xl bg-surface-hover px-3 py-2.5 text-left text-sm font-medium text-text-primary"
                : "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            }
          >
            <t.icon size={16} />
            <span className="whitespace-nowrap">{t.label}</span>
          </Link>
        ))}
        <div className="mt-2 border-t border-border pt-2 sm:mt-4">
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-danger hover:bg-danger/10"
            >
              <LogOut size={16} />
              <span className="whitespace-nowrap">Sign out</span>
            </button>
          </form>
        </div>
      </nav>

      <div className="min-w-0 flex-1">
        {tab === "account" ? (
          <div className="flex flex-col gap-4">
            <Card>
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-hover text-lg font-medium text-text-primary">
                    {initial}
                  </span>
                  {editingName ? (
                    <input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Your name"
                      autoFocus
                      className="min-w-0 flex-1 rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
                    />
                  ) : (
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {name || "Add your name"}
                      </p>
                      <p className="truncate text-xs text-text-tertiary">
                        {userEmail}
                      </p>
                    </div>
                  )}
                </div>
                {editingName ? (
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNameInput(name);
                        setEditingName(false);
                      }}
                      className="rounded-full border border-border px-3 py-2 text-sm text-text-secondary hover:text-text-primary"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveName}
                      disabled={saving || !nameInput.trim()}
                      className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    className="shrink-0 rounded-full border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-hover text-text-primary">
                    <Globe size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      Language
                    </p>
                    <p className="text-xs text-text-tertiary">
                      More languages coming soon
                    </p>
                  </div>
                </div>
                <select
                  disabled
                  className="cursor-not-allowed rounded-full border border-border bg-transparent px-3 py-2 text-sm text-text-tertiary"
                >
                  <option>English</option>
                </select>
              </div>
            </Card>

            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6">
              <p className="text-sm font-medium text-text-primary">
                Login connections
              </p>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-hover text-text-primary">
                    <ShieldCheck size={16} />
                  </span>
                  <div>
                    <p className="text-sm text-text-primary">
                      {signInMethod}
                    </p>
                    <p className="text-xs text-text-tertiary">{userEmail}</p>
                  </div>
                </div>
                <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs text-success">
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-hover text-text-primary">
                    <ShieldCheck size={16} />
                  </span>
                  <div>
                    <p className="text-sm text-text-primary">Apple</p>
                    <p className="text-xs text-text-tertiary">
                      Not connected
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    window.alert("Sign in with Apple is coming soon!")
                  }
                  className="shrink-0 rounded-full border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
                >
                  Connect
                </button>
              </div>
            </div>

            <PasswordCard hasPassword={hasPassword} />
          </div>
        ) : null}

        {tab === "api-keys" ? (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-medium text-text-secondary">
                Your API keys (BYOK)
              </h2>
              <p className="mt-1 text-xs text-text-tertiary">
                Used only to run your chat and generate your own scene images
                and voiceovers. Stored encrypted, never shared, never billed
                through us.
              </p>
            </div>
            <ApiKeysForm />
          </div>
        ) : null}

        {tab === "plan" ? (
          <div className="flex flex-col gap-4">
            <Card>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Free plan
                  </p>
                  <p className="mt-1 text-xs text-text-tertiary">
                    Unlimited projects while we build billing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => window.alert("Billing is coming soon!")}
                  className="flex shrink-0 items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
                >
                  <Zap size={15} />
                  Upgrade
                </button>
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-hover text-text-primary">
                    <BarChart3 size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      Videos this month
                    </p>
                    <p className="text-xs text-text-tertiary">
                      No cap while we build billing
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-2xl font-semibold text-text-primary">
                  {videosThisMonth}
                </p>
              </Card>

              <SoonRow
                icon={CreditCard}
                title="Payment method"
                subtitle="No card on file"
                actionLabel="Add"
                message="Payment methods are coming soon!"
              />
            </div>

            <SoonRow
              icon={Receipt}
              title="Billing information"
              subtitle="View your billing history and download invoices"
              actionLabel="Invoices"
              message="Invoices are coming soon!"
            />
          </div>
        ) : null}

        {tab === "support" ? (
          <Card>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-hover text-text-primary">
                  <Mail size={16} />
                </span>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Need help?
                  </p>
                  <p className="text-xs text-text-tertiary">
                    No ticketing system yet — email goes straight to the
                    team.
                  </p>
                </div>
              </div>
              {/* Placeholder address until a real support inbox exists —
                  same "TBD" pattern as the music library credits. */}
              <a
                href="mailto:support@krispy.app"
                className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
              >
                Contact support
              </a>
            </div>
          </Card>
        ) : null}

        {tab === "terms" ? (
          <Card>
            <p className="text-sm font-medium text-text-primary">
              Terms & policies
            </p>
            <p className="mt-2 text-xs leading-relaxed text-text-tertiary">
              In short: your BYOK API keys are stored encrypted and used only
              to generate your own scenes — never shared, never billed
              through us. Full legal text is on its own pages.
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-border px-4 py-2 text-xs text-text-secondary transition-colors hover:text-text-primary"
              >
                Terms of Use ↗
              </Link>
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-border px-4 py-2 text-xs text-text-secondary transition-colors hover:text-text-primary"
              >
                Privacy Policy ↗
              </Link>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
