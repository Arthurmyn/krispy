import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export type LegalSection = { heading: string; body: string };

export function LegalPageLayout({
  title,
  lastUpdated,
  intro,
  sections,
  notice,
}: {
  title: string;
  lastUpdated: string;
  intro?: string;
  sections: LegalSection[];
  notice?: string;
}) {
  return (
    <div className="min-h-screen bg-app px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 text-sm text-text-tertiary transition-colors hover:text-text-primary"
        >
          <ArrowLeft size={15} />
          Back to Krispy
        </Link>

        <h1 className="text-3xl font-semibold text-text-primary">{title}</h1>
        <p className="mt-2 text-sm text-text-tertiary">
          Last updated: {lastUpdated}
        </p>

        {intro ? (
          <p className="mt-6 text-sm leading-relaxed text-text-secondary">
            {intro}
          </p>
        ) : null}

        <div className="mt-10 flex flex-col gap-8">
          {sections.map((section, i) => (
            <div key={section.heading}>
              <h2 className="text-sm font-semibold text-text-primary">
                {i + 1}. {section.heading}
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-text-secondary">
                {section.body}
              </p>
            </div>
          ))}
        </div>

        {notice ? (
          <div className="mt-10 rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs font-medium tracking-wide text-text-tertiary uppercase">
              Important notice
            </p>
            <p className="mt-2 text-xs leading-relaxed text-text-tertiary">
              {notice}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
