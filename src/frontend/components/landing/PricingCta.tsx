"use client";

// Paid tiers aren't wired to real billing yet (see ProfileMenu's "Upgrade
// to Pro" for the same pattern) — this says so instead of pretending a
// checkout flow exists.
export function PricingCta({
  label,
  highlighted,
}: {
  label: string;
  highlighted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        window.alert(
          "Paid plans are coming soon! Everything runs on your own BYOK keys for free in the meantime.",
        )
      }
      className={
        highlighted
          ? "flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
          : "flex items-center justify-center rounded-full border border-border px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
      }
    >
      {label}
    </button>
  );
}
