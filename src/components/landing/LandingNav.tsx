"use client";

import Link from "next/link";

type SubLink = { label: string; href: string; external?: boolean };
type NavLink = {
  label: string;
  href: string;
  external?: boolean;
  submenu?: SubLink[];
};

// Links that point into the app (not landing-page anchors) open in a new
// tab — clicking them shouldn't navigate the marketing site itself away.
const NAV_LINKS: NavLink[] = [
  {
    label: "API keys",
    href: "/app/settings",
    external: true,
    submenu: [
      { label: "Manage your keys", href: "/app/settings", external: true },
      { label: "How BYOK works", href: "#byok" },
    ],
  },
  {
    label: "Resources",
    href: "#how-it-works",
    submenu: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  { label: "About Us", href: "#footer" },
];

export function LandingNav() {
  return (
    <nav className="relative z-20 flex items-center justify-between px-8 py-6">
      <Link href="/" className="flex items-center gap-2">
        <span className="text-lg font-semibold text-white">Krispy</span>
      </Link>

      <div className="hidden items-center gap-10 md:flex">
        {NAV_LINKS.map((link) => (
          <div key={link.label} className="group relative py-2">
            <Link
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="text-sm font-medium text-white/80 transition-colors group-hover:text-white"
            >
              {link.label}
            </Link>
            <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-white transition-all duration-200 group-hover:w-full" />

            {link.submenu ? (
              <div className="invisible absolute left-0 top-full min-w-[190px] translate-y-1 rounded-xl border border-white/10 bg-black/80 py-2 opacity-0 backdrop-blur-md transition-all duration-150 group-hover:visible group-hover:translate-y-2 group-hover:opacity-100">
                {link.submenu.map((sub) => (
                  <Link
                    key={sub.label}
                    href={sub.href}
                    target={sub.external ? "_blank" : undefined}
                    rel={sub.external ? "noopener noreferrer" : undefined}
                    className="block px-4 py-2 text-sm text-white/70 hover:text-white"
                  >
                    {sub.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-6">
        <a
          href="#pricing"
          className="hidden text-sm font-medium text-white/80 transition-colors hover:text-white sm:inline"
        >
          Pricing
        </a>
        <Link
          href="/app"
          className="hidden text-sm font-medium text-white/80 transition-colors hover:text-white sm:inline"
        >
          Sign in
        </Link>
        <Link
          href="/app"
          className="liquid-glass rounded-full px-6 py-2 text-sm font-medium text-white"
        >
          Start Free Now
        </Link>
      </div>
    </nav>
  );
}
