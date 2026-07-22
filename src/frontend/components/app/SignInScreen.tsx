import Link from "next/link";
import { Mail, Sparkles, X } from "lucide-react";
import { signIn } from "@/backend/auth";
import { HeroVideo } from "@/frontend/components/landing/HeroVideo";
import { GoogleIcon } from "./GoogleIcon";
import { EmailPasswordForm } from "./EmailPasswordForm";

// Split-screen sign-in, adapted from the Higgsfield-style reference: hero
// media on the left, auth card on the right. Only lists sign-in methods we
// actually support — no Apple/Microsoft, since those don't exist here and a
// dead button would be worse than no button.
export function SignInScreen() {
  return (
    <div className="flex min-h-screen w-full bg-app">
      <Link
        href="/"
        aria-label="Back to Krispy"
        className="fixed right-6 top-6 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-tertiary transition-colors hover:text-text-primary"
      >
        <X size={16} />
      </Link>

      <div className="relative hidden w-1/2 overflow-hidden lg:block">
        <HeroVideo src="/hero-video.mp4" />
        <div className="absolute inset-0 bg-gradient-to-t from-app via-app/30 to-app/70" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-12">
          <div className="flex items-center gap-2 text-white">
            <span className="text-lg font-semibold">Krispy</span>
          </div>
          <p
            className="max-w-sm text-3xl leading-snug text-white"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            One chat away from your next short.
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col items-center justify-center px-6 py-16 lg:w-1/2">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-hover text-text-primary">
              <Sparkles size={20} />
            </span>
            <h1 className="text-2xl font-semibold text-text-primary">
              Welcome to Krispy
            </h1>
            <p className="text-sm text-text-secondary">
              Sign in to start turning topics into finished shorts.
            </p>
          </div>

          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/app" });
            }}
          >
            <button className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover">
              <GoogleIcon />
              Continue with Google
            </button>
          </form>

          <div className="flex items-center gap-3 text-xs text-text-tertiary">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <EmailPasswordForm />

          {process.env.NODE_ENV !== "production" ? (
            <>
              <div className="flex items-center gap-3 text-xs text-text-tertiary">
                <span className="h-px flex-1 bg-border" />
                dev sign-in
                <span className="h-px flex-1 bg-border" />
              </div>
              <form
                action={async (formData: FormData) => {
                  "use server";
                  await signIn("dev-email", {
                    email: formData.get("email"),
                    redirectTo: "/app",
                  });
                }}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3">
                  <Mail size={15} className="text-text-tertiary" />
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="dev@local"
                    className="flex-1 bg-transparent py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
                  />
                </div>
                <button className="rounded-xl border border-border px-4 py-2.5 text-sm text-text-secondary transition-colors hover:text-text-primary">
                  Continue with dev email
                </button>
              </form>
            </>
          ) : null}

          <p className="text-center text-xs text-text-tertiary">
            Your BYOK keys are encrypted and never resold —{" "}
            <Link href="/#byok" className="text-accent hover:underline">
              see how it works
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
