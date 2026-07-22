import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clapperboard,
  Image as ImageIcon,
  KeyRound,
  Mic,
  MessagesSquare,
} from "lucide-react";
import { HeroVideo } from "@/frontend/components/landing/HeroVideo";
import { LandingNav } from "@/frontend/components/landing/LandingNav";
import { Reveal } from "@/frontend/components/landing/Reveal";
import { LanguageSwitcher } from "@/frontend/components/landing/LanguageSwitcher";
import { SupportChatWidget } from "@/frontend/components/landing/SupportChatWidget";
import { PricingCta } from "@/frontend/components/landing/PricingCta";

const FOOTER_PRODUCT_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#byok", label: "BYOK" },
];

const FOOTER_LEGAL_LINKS = [
  { href: "/terms", label: "Terms of Use" },
  { href: "/privacy", label: "Privacy Policy" },
];

const FEATURES = [
  {
    icon: MessagesSquare,
    title: "Chat your way to a script",
    body: "Land on a niche, a visual style, and a tight scene-by-scene script by talking it through with Gemini, stage by stage — no blank-page staring, no re-explaining yourself every turn.",
  },
  {
    icon: ImageIcon,
    title: "Review every scene",
    body: "AI-generated images per scene, right in the workflow. Not happy with one? Drag in a reference photo, select just the part that's off, and regenerate only that scene.",
  },
  {
    icon: Mic,
    title: "Your own voice",
    body: "Free narration through your own Gemini key, or plug in ElevenLabs for a premium voice. Edit any line's text and re-generate just that scene's audio.",
  },
  {
    icon: Clapperboard,
    title: "Auto-assembled MP4",
    body: "Image timing, transitions, and subtitle sync are handled automatically. Preview the real composition live, reorder or re-time any scene, then download a finished short, ready to post.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Chat to lock the niche & style",
    body: "Confirm your content niche, agree on a visual style passport, duration, and language, all through conversation.",
  },
  {
    n: "02",
    title: "Land on the idea & script",
    body: "Brainstorm the specific video idea, then get a full scene-by-scene script built for your niche and platform's pacing.",
  },
  {
    n: "03",
    title: "Review and regenerate scenes",
    body: "Generate images and voiceover per scene using your own keys, tweak any one that's off before moving on.",
  },
  {
    n: "04",
    title: "Assemble & download your MP4",
    body: "Preview the real composition, adjust order or timing if needed, then one click assembles a downloadable video.",
  },
];

const PRICING_TIERS = [
  {
    name: "Free",
    subtitle: "Bring your own keys, try it out",
    price: "$0",
    period: "/mo",
    features: [
      "Full chat → script → scenes pipeline",
      "Up to 3 rendered videos / month",
      "Watermark on exports",
      "BYOK — your own Gemini / ElevenLabs keys",
    ],
    cta: "Start free",
  },
  {
    name: "Pro",
    subtitle: "For regular creators",
    price: "$14",
    period: "/mo",
    highlighted: true,
    features: [
      "Everything in Free",
      "No watermark",
      "Priority rendering",
      "Unlimited videos",
      "All aspect ratios & platforms",
    ],
    cta: "Go Pro",
  },
  {
    name: "Studio",
    subtitle: "For teams & agencies",
    price: "$45",
    period: "/mo",
    features: [
      "Everything in Pro",
      "Multiple projects & seats",
      "Saved brand/style presets",
      "Priority support",
    ],
    cta: "Contact us",
  },
];

const FAQS = [
  {
    q: "What does BYOK mean, and why do I need my own API keys?",
    a: "BYOK = Bring Your Own Key. Krispy runs your chat, image, and voiceover generation through your own Gemini (and optionally ElevenLabs) key instead of reselling AI access. We never see the generation costs — you do, directly with the provider — which is what keeps our own pricing low.",
  },
  {
    q: "Which AI providers do I actually need?",
    a: "Just a Google Gemini key to start — it covers chat, images, and voiceover, and Google's free tier is enough for a handful of shorts a month. ElevenLabs is optional, only if you want a more premium voice.",
  },
  {
    q: "Is my API key safe with you?",
    a: "Keys are encrypted at rest (AES-256-GCM) and only decrypted server-side at the moment a generation request is made on your behalf. We never log or display the raw key after you save it.",
  },
  {
    q: "What happens on the Free plan?",
    a: "Everything in the pipeline works — chat, images, voiceover, assembly — up to 3 rendered videos a month, exported with a small watermark.",
  },
  {
    q: "What video formats can I export?",
    a: "9:16, 16:9, and 1:1, tuned for TikTok, YouTube, or Instagram Reels — pick it when you start a project.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-app">
      <div className="relative h-screen">
        <HeroVideo src="/hero-video.mp4" />
        <div className="absolute inset-0 bg-app/40" />

        <LandingNav />

        <div className="relative z-10 flex h-[calc(100%-96px)] flex-col items-center justify-center px-6 text-center">
          <h1
            className="mb-6 text-5xl leading-tight text-white sm:whitespace-nowrap md:text-6xl lg:text-7xl"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            One chat away from your next short
          </h1>
          <p className="mb-10 max-w-lg text-base leading-relaxed text-white/80">
            Pick a category, chat your way to a script, review AI scenes, and
            download a ready-to-post video — powered by your own AI keys.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/app"
              className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black"
            >
              Start creating
              <ArrowRight size={16} />
            </Link>
            <a
              href="#how-it-works"
              className="liquid-glass rounded-full px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/5"
            >
              See how it works
            </a>
          </div>
        </div>
      </div>

      <section id="features" className="relative z-10 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2 className="mb-3 text-center text-xs font-medium tracking-wide text-text-tertiary uppercase">
              Features
            </h2>
            <p className="mx-auto mb-14 max-w-xl text-center text-2xl font-semibold text-text-primary">
              Everything between a topic and a finished video
            </p>
          </Reveal>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature, i) => (
              <Reveal key={feature.title} delayMs={i * 80}>
                <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-hover text-text-primary">
                    <feature.icon size={17} />
                  </span>
                  <h3 className="text-sm font-semibold text-text-primary">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-text-secondary">
                    {feature.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="relative z-10 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2 className="mb-3 text-center text-xs font-medium tracking-wide text-text-tertiary uppercase">
              How it works
            </h2>
            <p className="mx-auto mb-14 max-w-xl text-center text-2xl font-semibold text-text-primary">
              Four steps, no manual editing required
            </p>
          </Reveal>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <Reveal key={step.n} delayMs={i * 80}>
                <div className="flex flex-col gap-2">
                  <span
                    className="text-3xl font-semibold text-text-tertiary"
                    style={{ fontFamily: "var(--font-instrument-serif)" }}
                  >
                    {step.n}
                  </span>
                  <h3 className="text-sm font-semibold text-text-primary">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-text-secondary">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="byok" className="relative z-10 px-6 py-24">
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-5 rounded-2xl border border-border bg-surface px-8 py-14 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover text-text-primary">
            <KeyRound size={18} />
          </span>
          <h2 className="text-2xl font-semibold text-text-primary">
            We&apos;re not reselling AI generation
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-text-secondary">
            Everything runs on your own keys — Gemini for chat, scripts,
            images and voiceover (Google&apos;s free tier covers a lot of
            shorts), and ElevenLabs if you want a premium voice. We just
            build the automation on top — never billed through us.
          </p>
          <Link
            href="/app/settings?tab=api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-accent hover:underline"
          >
            See how BYOK keys work →
          </Link>
        </Reveal>
      </section>

      <section id="pricing" className="relative z-10 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2 className="mb-3 text-center text-xs font-medium tracking-wide text-text-tertiary uppercase">
              Pricing
            </h2>
            <p className="mx-auto mb-14 max-w-xl text-center text-2xl font-semibold text-text-primary">
              Bring your own AI keys, pay us for the automation
            </p>
          </Reveal>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {PRICING_TIERS.map((tier, i) => (
              <Reveal key={tier.name} delayMs={i * 80}>
                <div
                  className={`flex h-full flex-col gap-5 rounded-2xl border p-6 ${
                    tier.highlighted
                      ? "border-accent bg-accent/5"
                      : "border-border bg-surface"
                  }`}
                >
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">
                      {tier.name}
                    </h3>
                    <p className="mt-1 text-xs text-text-tertiary">
                      {tier.subtitle}
                    </p>
                  </div>
                  <p className="text-3xl font-semibold text-text-primary">
                    {tier.price}
                    <span className="text-sm font-normal text-text-tertiary">
                      {tier.period}
                    </span>
                  </p>
                  <ul className="flex flex-1 flex-col gap-2 text-sm text-text-secondary">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check
                          size={14}
                          className="mt-0.5 shrink-0 text-accent"
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {tier.name === "Free" ? (
                    <Link
                      href="/app"
                      className="flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black"
                    >
                      {tier.cta}
                    </Link>
                  ) : (
                    <PricingCta
                      label={tier.cta}
                      highlighted={tier.highlighted}
                    />
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="relative z-10 px-6 py-24">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <h2 className="mb-3 text-center text-xs font-medium tracking-wide text-text-tertiary uppercase">
              FAQ
            </h2>
            <p className="mx-auto mb-14 max-w-xl text-center text-2xl font-semibold text-text-primary">
              Questions people actually ask
            </p>
          </Reveal>
          <div className="flex flex-col gap-3">
            {FAQS.map((item, i) => (
              <Reveal key={item.q} delayMs={i * 60}>
                <details className="group rounded-2xl border border-border bg-surface p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-text-primary">
                    {item.q}
                    <span className="ml-4 shrink-0 text-text-tertiary transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                    {item.a}
                  </p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 py-24">
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <h2
            className="text-4xl text-text-primary"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            Ready to make your first short?
          </h2>
          <Link
            href="/app"
            className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
          >
            Start creating
            <ArrowRight size={16} />
          </Link>
        </Reveal>
      </section>

      <footer
        id="footer"
        className="relative z-10 border-t border-border px-6 py-12"
      >
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 flex flex-col gap-3 sm:col-span-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary">
                Krispy
              </span>
            </div>
            <p className="text-xs leading-relaxed text-text-tertiary">
              Turn a topic into a finished short, powered by your own AI
              keys.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <h3 className="text-xs font-medium tracking-wide text-text-tertiary uppercase">
              Product
            </h3>
            {FOOTER_PRODUCT_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs text-text-secondary hover:text-text-primary"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex flex-col gap-2.5">
            <h3 className="text-xs font-medium tracking-wide text-text-tertiary uppercase">
              Legal
            </h3>
            {FOOTER_LEGAL_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs text-text-secondary hover:text-text-primary"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-2.5">
            <h3 className="text-xs font-medium tracking-wide text-text-tertiary uppercase">
              Support
            </h3>
            <a
              href="mailto:support@krispy.app"
              className="text-xs text-text-secondary hover:text-text-primary"
            >
              Contact / Feedback
            </a>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-5xl border-t border-border pt-6">
          <p className="text-xs text-text-tertiary">
            © 2026 Krispy. All rights reserved.
          </p>
        </div>
      </footer>

      <LanguageSwitcher />
      <SupportChatWidget />
    </div>
  );
}
