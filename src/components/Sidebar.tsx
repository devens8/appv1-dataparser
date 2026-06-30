"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspaceStore } from "@/store/workspaces";
import { accent } from "@/lib/colors";
import SessionMenu from "@/components/SessionMenu";
import {
  IconChart,
  IconClock,
  IconCurve,
  IconGrid,
  IconHome,
  IconLayers,
  IconLock,
  IconLogo,
  IconPulse,
  IconShield,
  IconSigma,
  IconStats,
  IconTrend,
} from "@/components/icons";

const TOOLS = [
  { label: "Charts & visualize", icon: IconChart },
  { label: "Curve fitting", icon: IconCurve },
  { label: "Statistics", icon: IconStats },
  { label: "ANOVA & t-tests", icon: IconSigma },
  { label: "Compare datasets", icon: IconLayers },
  { label: "Longitudinal", icon: IconClock },
  { label: "Anomaly detection", icon: IconPulse },
  { label: "Trends & outliers", icon: IconTrend },
];

const COMING_SOON = [
  { label: "Regulatory standards", icon: IconShield },
  { label: "Graphical programming", icon: IconLayers },
];

export default function Sidebar() {
  const pathname = usePathname();
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const hydrated = useWorkspaceStore((s) => s.hydrated);

  const recent = [...workspaces]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 6);

  return (
    <aside className="relative flex w-64 shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-950/60">
      <div className="flex items-center gap-2.5 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-gradient-to-tr from-orange-500 to-orange-500 text-white shadow-[0_0_18px_-4px_rgba(249,115,22,0.7)]">
          <IconLogo className="h-4.5 w-4.5" width={18} height={18} />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight text-zinc-100">
            Strata
          </div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            Data Workspace
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <SectionLabel>Library</SectionLabel>
        <NavLink href="/" active={pathname === "/"} icon={IconHome}>
          Home
        </NavLink>
        <NavLink
          href="/?view=all"
          active={pathname?.startsWith("/?view=all") ?? false}
          icon={IconGrid}
        >
          All workspaces
        </NavLink>

        <SectionLabel>Analysis tools</SectionLabel>
        {TOOLS.map((t) => (
          <div
            key={t.label}
            className="flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-zinc-400"
          >
            <t.icon className="h-4 w-4 text-zinc-500" width={16} height={16} />
            {t.label}
          </div>
        ))}
        <p className="px-3 pt-1 text-[11px] leading-relaxed text-zinc-500">
          Open a workspace with data to run any tool.
        </p>

        <SectionLabel>Recent</SectionLabel>
        {!hydrated ? (
          <div className="space-y-1.5 px-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-8 rounded-sm" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <p className="px-3 text-[11px] text-zinc-500">No workspaces yet.</p>
        ) : (
          recent.map((w) => {
            const a = accent(w.color);
            const active = pathname === `/workspace/${w.id}`;
            return (
              <Link
                key={w.id}
                href={`/workspace/${w.id}`}
                className={`flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-zinc-800/70 font-medium text-zinc-100"
                    : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
                }`}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${a.bg} shadow-[0_0_8px_currentColor]`}
                />
                <span className="truncate">{w.name}</span>
              </Link>
            );
          })
        )}

        <SectionLabel>Roadmap</SectionLabel>
        {COMING_SOON.map((t) => (
          <div
            key={t.label}
            className="flex items-center justify-between rounded-sm px-3 py-2 text-sm text-zinc-500"
          >
            <span className="flex items-center gap-2.5">
              <t.icon className="h-4 w-4" width={16} height={16} />
              {t.label}
            </span>
            <IconLock className="h-3.5 w-3.5 text-zinc-600" width={14} height={14} />
          </div>
        ))}
      </nav>

      <SessionMenu />
    </aside>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
      {children}
    </div>
  );
}

function NavLink({
  href,
  active,
  icon: Icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: (p: { className?: string; width?: number; height?: number }) => React.ReactElement;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-orange-500/10 font-medium text-orange-300 ring-1 ring-inset ring-orange-500/20"
          : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
      }`}
    >
      <Icon
        className={`h-4 w-4 ${active ? "text-orange-400" : "text-zinc-500"}`}
        width={16}
        height={16}
      />
      {children}
    </Link>
  );
}
