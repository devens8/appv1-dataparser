"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspaceStore } from "@/store/workspaces";
import { useUiStore } from "@/store/ui";
import { accent } from "@/lib/colors";
import SessionMenu from "@/components/SessionMenu";
import {
  IconChart,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconCurve,
  IconGrid,
  IconLayers,
  IconLogo,
  IconMoon,
  IconPulse,
  IconSigma,
  IconStats,
  IconSun,
  IconTable,
  IconTrend,
} from "@/components/icons";

const TOOLS = [
  { id: "charts", label: "Charts & visualize", icon: IconChart },
  { id: "curve-fit", label: "Curve fitting", icon: IconCurve },
  { id: "statistics", label: "Statistics", icon: IconStats },
  { id: "anova", label: "ANOVA & t-tests", icon: IconSigma },
  { id: "formula", label: "Formula columns · f(x)", icon: IconTable },
  { id: "compare", label: "Compare datasets", icon: IconLayers },
  { id: "longitudinal", label: "Longitudinal", icon: IconClock },
  { id: "anomaly", label: "Anomaly detection", icon: IconPulse },
  { id: "trends", label: "Trends & outliers", icon: IconTrend },
];

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const Icon = theme === "dark" ? IconSun : IconMoon;
  return (
    <button
      onClick={toggleTheme}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className={`flex items-center justify-center rounded-sm border border-line bg-panel/60 text-fgmuted transition-colors hover:border-orange-500/50 hover:text-accent ${
        compact ? "h-8 w-8" : "h-8 w-8"
      }`}
    >
      <Icon className="h-4 w-4" width={16} height={16} />
    </button>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  const recent = [...workspaces]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 6);

  // Collapsed rail — just the logo, an expand control and the theme toggle.
  if (collapsed) {
    return (
      <aside className="relative flex w-12 shrink-0 flex-col items-center border-r border-line bg-base/60 py-4">
        <Link
          href="/"
          className="flex h-8 w-8 items-center justify-center rounded-sm bg-orange-500/15 text-accent ring-1 ring-inset ring-orange-500/40"
          title="Home"
        >
          <IconLogo className="h-4 w-4" width={16} height={16} />
        </Link>
        <button
          onClick={toggleSidebar}
          title="Expand sidebar"
          className="mt-4 flex h-8 w-8 items-center justify-center rounded-sm border border-line bg-panel/60 text-fgmuted hover:border-orange-500/50 hover:text-accent"
        >
          <IconChevronRight className="h-4 w-4" width={16} height={16} />
        </button>
        <RailLink href="/workspaces" active={pathname === "/workspaces"} title="Workspaces" icon={IconGrid} />
        <div className="mt-auto">
          <ThemeToggle compact />
        </div>
      </aside>
    );
  }

  return (
    <aside className="relative flex w-64 shrink-0 flex-col border-r border-line bg-base/60">
      <div className="flex items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2.5" title="Home">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-orange-500/15 text-accent ring-1 ring-inset ring-orange-500/40">
            <IconLogo className="h-4.5 w-4.5" width={18} height={18} />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight text-fg">
              Strata
            </div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-fgsubtle">
              Data Workspace
            </div>
          </div>
        </Link>
        <button
          onClick={toggleSidebar}
          title="Collapse sidebar"
          className="flex h-7 w-7 items-center justify-center rounded-sm border border-line bg-panel/60 text-fgmuted hover:border-orange-500/50 hover:text-accent"
        >
          <IconChevronLeft className="h-4 w-4" width={16} height={16} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <SectionLabel>Library</SectionLabel>
        <NavLink
          href="/workspaces"
          active={pathname === "/workspaces"}
          icon={IconGrid}
        >
          Workspaces
        </NavLink>

        <SectionLabel>Analysis tools</SectionLabel>
        {TOOLS.map((t) => (
          <NavLink
            key={t.id}
            href={`/learn/${t.id}`}
            active={pathname === `/learn/${t.id}`}
            icon={t.icon}
          >
            {t.label}
          </NavLink>
        ))}

        <SectionLabel>Recent workspaces</SectionLabel>
        {!hydrated ? (
          <div className="space-y-1.5 px-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-8 rounded-sm" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <p className="px-3 text-[11px] text-fgsubtle">No workspaces yet.</p>
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
                    ? "bg-panel2/70 font-medium text-fg"
                    : "text-fgmuted hover:bg-panel2/40 hover:text-fg"
                }`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${a.bg}`} />
                <span className="truncate">{w.name}</span>
              </Link>
            );
          })
        )}
      </nav>

      <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-fgsubtle">
          Appearance
        </span>
        <ThemeToggle />
      </div>

      <SessionMenu />
    </aside>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-wider text-fgsubtle">
      {children}
    </div>
  );
}

type IconType = (p: { className?: string; width?: number; height?: number }) => React.ReactElement;

function NavLink({
  href,
  active,
  icon: Icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: IconType;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-orange-500/10 font-medium text-accent ring-1 ring-inset ring-orange-500/20"
          : "text-fgmuted hover:bg-panel2/40 hover:text-fg"
      }`}
    >
      <Icon
        className={`h-4 w-4 ${active ? "text-accent" : "text-fgsubtle"}`}
        width={16}
        height={16}
      />
      {children}
    </Link>
  );
}

function RailLink({
  href,
  active,
  title,
  icon: Icon,
}: {
  href: string;
  active: boolean;
  title: string;
  icon: IconType;
}) {
  return (
    <Link
      href={href}
      title={title}
      className={`mt-2 flex h-8 w-8 items-center justify-center rounded-sm transition-colors ${
        active
          ? "bg-orange-500/15 text-accent ring-1 ring-inset ring-orange-500/30"
          : "text-fgmuted hover:bg-panel2/40 hover:text-fg"
      }`}
    >
      <Icon className="h-4 w-4" width={16} height={16} />
    </Link>
  );
}
