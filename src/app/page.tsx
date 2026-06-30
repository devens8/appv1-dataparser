"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NewWorkspaceModal from "@/components/NewWorkspaceModal";
import AiInsights from "@/components/AiInsights";
import { useWorkspaceStore } from "@/store/workspaces";
import { useUiStore } from "@/store/ui";
import {
  IconChart,
  IconCurve,
  IconLogo,
  IconMoon,
  IconPlus,
  IconPulse,
  IconSigma,
  IconSun,
  IconTable,
} from "@/components/icons";

const AUDIENCE = [
  "Lab researchers",
  "Bench & bio scientists",
  "Bioinformaticians",
  "Engineers & analysts",
  "Students",
];

const CAPABILITIES = [
  { icon: IconChart, label: "Visualize", desc: "Scatter, line, box & correlation" },
  { icon: IconCurve, label: "Curve fit", desc: "Dose–response, kinetics, growth" },
  { icon: IconSigma, label: "Statistics", desc: "ANOVA, t-tests, normality" },
  { icon: IconPulse, label: "Detect", desc: "Outliers & change-points" },
  { icon: IconTable, label: "Transform", desc: "Derived columns · f(x)" },
];

function ThemeToggle() {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const Icon = theme === "dark" ? IconSun : IconMoon;
  return (
    <button
      onClick={toggleTheme}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="flex h-9 w-9 items-center justify-center rounded-sm border border-line bg-panel/60 text-fgmuted transition-colors hover:border-orange-500/50 hover:text-accent"
    >
      <Icon className="h-4 w-4" width={16} height={16} />
    </button>
  );
}

export default function HomePage() {
  const router = useRouter();
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);
  const [modalOpen, setModalOpen] = useState(false);

  const handleCreate = (name: string, description: string) => {
    const id = createWorkspace(name, description);
    setModalOpen(false);
    router.push(`/workspace/${id}`);
  };

  return (
    <main className="min-h-screen overflow-y-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b border-line bg-base/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-orange-500/15 text-accent ring-1 ring-inset ring-orange-500/40">
              <IconLogo className="h-4.5 w-4.5" width={18} height={18} />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight text-fg">
                Strata
              </div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-fgsubtle">
                Scientific Data Workspace
              </div>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 pb-24">
        {/* Hero */}
        <header className="animate-fade-in-up pt-14 text-center">
          <span className="inline-flex items-center gap-2 rounded-sm border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-accent">
            Analysis · graphing · statistics
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
            Turn raw lab data into
            <span className="text-accent"> publication-grade</span> insight
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-fgmuted">
            Import a CSV and get descriptive statistics, nonlinear curve fits
            (EC50 / kinetics), ANOVA &amp; t-tests, anomaly detection and
            publication-ready charts — no installs, no coding.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {AUDIENCE.map((a) => (
              <span
                key={a}
                className="rounded-sm border border-line bg-panel/50 px-2.5 py-1 text-xs text-fgmuted"
              >
                {a}
              </span>
            ))}
          </div>
        </header>

        {/* Drop a file → straight into a new workspace */}
        <section className="mt-10">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-fg">
              Start here — drop a file
            </h2>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 rounded-sm border border-line bg-panel/60 px-3 py-1.5 text-xs font-medium text-fgmuted transition-colors hover:border-orange-500/50 hover:text-accent"
            >
              <IconPlus className="h-3.5 w-3.5" width={14} height={14} />
              Or create an empty workspace
            </button>
          </div>
          <AiInsights autoOpen />
          <p className="mt-2 text-center text-[11px] text-fgsubtle">
            Your file is profiled in the browser and opens straight into a new
            workspace — ready to chart, fit and test.
          </p>
        </section>

        {/* Capabilities */}
        <section className="mt-12">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {CAPABILITIES.map((c) => (
              <div key={c.label} className="surface rounded-sm p-3.5 text-center">
                <c.icon
                  className="mx-auto h-5 w-5 text-accent"
                  width={20}
                  height={20}
                />
                <div className="mt-2 text-sm font-semibold text-fg">
                  {c.label}
                </div>
                <div className="mt-0.5 text-[11px] leading-tight text-fgsubtle">
                  {c.desc}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <NewWorkspaceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </main>
  );
}
