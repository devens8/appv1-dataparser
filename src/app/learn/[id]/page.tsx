"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import Chart from "@/components/Chart";
import { Panel } from "@/components/ui";
import { GUIDES, guideById } from "@/lib/guides";

export default function LearnPage() {
  const params = useParams<{ id: string }>();
  const guide = guideById(params.id);
  const option = useMemo(() => guide?.example() ?? null, [guide]);

  if (!guide) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-8 py-16 text-center">
          <h1 className="text-lg font-semibold text-fg">Guide not found</h1>
          <Link href="/learn/charts" className="mt-3 inline-block text-sm text-accent hover:underline">
            Browse the analysis guides →
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-8 py-10">
        <nav className="flex items-center gap-1.5 text-xs text-fgsubtle">
          <Link href="/" className="hover:text-fgmuted">Home</Link>
          <span>/</span>
          <span className="text-fgmuted">Learn</span>
          <span>/</span>
          <span className="text-fg">{guide.label}</span>
        </nav>

        <header className="mt-3">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {guide.label}
          </h1>
          <p className="mt-1.5 text-base text-accent">{guide.tagline}</p>
        </header>

        {/* Diagram */}
        <div className="mt-6">
          <Panel title="Worked example" subtitle={guide.exampleCaption}>
            <div className="p-3">
              {option && <Chart option={option} height={300} />}
            </div>
          </Panel>
        </div>

        {/* Explanations */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Section title="What it is" body={guide.what} />
          <Section title="Why it matters for research" body={guide.why} accent />
          <Section title="How to read it" body={guide.interpret} />
        </div>

        <p className="mt-6 text-[11px] text-fgsubtle">
          Educational overview. Open a workspace and import data to run this on
          your own measurements.
        </p>

        {/* Other guides */}
        <div className="mt-10">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-fgsubtle">
            Other analysis tools
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {GUIDES.filter((g) => g.id !== guide.id).map((g) => (
              <Link
                key={g.id}
                href={`/learn/${g.id}`}
                className="surface rounded-sm px-3 py-2 text-sm text-fgmuted transition-colors hover:border-orange-500/50 hover:text-accent"
              >
                {g.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Section({
  title,
  body,
  accent = false,
}: {
  title: string;
  body: string;
  accent?: boolean;
}) {
  return (
    <section
      className={`surface rounded-sm p-4 ${accent ? "ring-1 ring-inset ring-orange-500/20" : ""}`}
    >
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-accent">
        {title}
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-fgmuted">{body}</p>
    </section>
  );
}
