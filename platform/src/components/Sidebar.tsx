"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspaceStore } from "@/store/workspaces";
import { accent } from "@/lib/colors";
import {
  IconChart,
  IconClock,
  IconGrid,
  IconHome,
  IconLayers,
  IconLock,
  IconLogo,
  IconShield,
  IconStats,
  IconTarget,
  IconTrend,
} from "@/components/icons";

const TOOLS = [
  { label: "Statistics", icon: IconStats },
  { label: "Outliers", icon: IconTarget },
  { label: "Trends", icon: IconTrend },
  { label: "Visualize", icon: IconChart },
];

const COMING_SOON = [
  { label: "Compare experiments", icon: IconLayers },
  { label: "Longitudinal tracking", icon: IconClock },
  { label: "Lab access & clearance", icon: IconShield },
];

export default function Sidebar() {
  const pathname = usePathname();
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const hydrated = useWorkspaceStore((s) => s.hydrated);

  const recent = [...workspaces]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 6);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2.5 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-sm">
          <IconLogo className="h-4.5 w-4.5" width={18} height={18} />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight text-slate-800">
            Strata
          </div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
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
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-500"
          >
            <t.icon className="h-4 w-4 text-slate-400" width={16} height={16} />
            {t.label}
          </div>
        ))}
        <p className="px-3 pt-1 text-[11px] leading-relaxed text-slate-400">
          Open a workspace with data to run any tool.
        </p>

        <SectionLabel>Recent</SectionLabel>
        {!hydrated ? (
          <div className="space-y-1.5 px-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-8 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <p className="px-3 text-[11px] text-slate-400">No workspaces yet.</p>
        ) : (
          recent.map((w) => {
            const a = accent(w.color);
            const active = pathname === `/workspace/${w.id}`;
            return (
              <Link
                key={w.id}
                href={`/workspace/${w.id}`}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-slate-100 font-medium text-slate-800"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${a.bg}`} />
                <span className="truncate">{w.name}</span>
              </Link>
            );
          })
        )}

        <SectionLabel>Roadmap</SectionLabel>
        {COMING_SOON.map((t) => (
          <div
            key={t.label}
            className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-400"
          >
            <span className="flex items-center gap-2.5">
              <t.icon className="h-4 w-4" width={16} height={16} />
              {t.label}
            </span>
            <IconLock className="h-3.5 w-3.5 text-slate-300" width={14} height={14} />
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
            LB
          </div>
          <div className="leading-tight">
            <div className="text-xs font-medium text-slate-700">Lab user</div>
            <div className="text-[10px] text-slate-400">Local session</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
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
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-indigo-50 font-medium text-indigo-700"
          : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      <Icon
        className={`h-4 w-4 ${active ? "text-indigo-600" : "text-slate-400"}`}
        width={16}
        height={16}
      />
      {children}
    </Link>
  );
}
