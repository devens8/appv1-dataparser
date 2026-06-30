/**
 * Static class lookups for workspace accent colors. Tailwind only emits classes
 * it can see as literal strings, so dynamic `bg-${c}-500` is avoided here.
 *
 * The whole product is black + orange, so every accent lives in the warm family
 * (orange / amber / red / yellow) — distinct enough to tell workspaces apart,
 * consistent enough to read as one scientific theme.
 */
export interface AccentClasses {
  bg: string;
  bgSoft: string;
  text: string;
  ring: string;
  gradient: string;
}

const MAP: Record<string, AccentClasses> = {
  // Keys match the workspace-store palette names; all resolve to warm tones.
  indigo: {
    bg: "bg-orange-500",
    bgSoft: "bg-orange-500/10",
    text: "text-orange-300",
    ring: "ring-orange-500/30",
    gradient: "from-orange-500 to-amber-400",
  },
  sky: {
    bg: "bg-amber-500",
    bgSoft: "bg-amber-500/10",
    text: "text-amber-300",
    ring: "ring-amber-500/30",
    gradient: "from-amber-500 to-orange-400",
  },
  emerald: {
    bg: "bg-orange-400",
    bgSoft: "bg-orange-400/10",
    text: "text-orange-200",
    ring: "ring-orange-400/30",
    gradient: "from-orange-400 to-yellow-400",
  },
  amber: {
    bg: "bg-amber-500",
    bgSoft: "bg-amber-500/10",
    text: "text-amber-300",
    ring: "ring-amber-500/30",
    gradient: "from-amber-500 to-orange-500",
  },
  rose: {
    bg: "bg-red-500",
    bgSoft: "bg-red-500/10",
    text: "text-red-300",
    ring: "ring-red-500/30",
    gradient: "from-red-500 to-orange-500",
  },
  violet: {
    bg: "bg-orange-600",
    bgSoft: "bg-orange-600/10",
    text: "text-orange-300",
    ring: "ring-orange-600/30",
    gradient: "from-orange-600 to-amber-500",
  },
  teal: {
    bg: "bg-yellow-500",
    bgSoft: "bg-yellow-500/10",
    text: "text-yellow-300",
    ring: "ring-yellow-500/30",
    gradient: "from-yellow-500 to-orange-400",
  },
  fuchsia: {
    bg: "bg-red-400",
    bgSoft: "bg-red-400/10",
    text: "text-red-300",
    ring: "ring-red-400/30",
    gradient: "from-red-400 to-orange-400",
  },
};

export function accent(color: string): AccentClasses {
  return MAP[color] ?? MAP.indigo;
}
