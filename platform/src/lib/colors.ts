/**
 * Static class lookups for workspace accent colors. Tailwind only emits classes
 * it can see as literal strings, so dynamic `bg-${c}-500` is avoided here.
 */
export interface AccentClasses {
  bg: string;
  bgSoft: string;
  text: string;
  ring: string;
  gradient: string;
}

const MAP: Record<string, AccentClasses> = {
  indigo: {
    bg: "bg-indigo-500",
    bgSoft: "bg-indigo-500/10",
    text: "text-indigo-300",
    ring: "ring-indigo-500/30",
    gradient: "from-indigo-500 to-violet-500",
  },
  sky: {
    bg: "bg-sky-500",
    bgSoft: "bg-sky-500/10",
    text: "text-sky-300",
    ring: "ring-sky-500/30",
    gradient: "from-sky-500 to-cyan-400",
  },
  emerald: {
    bg: "bg-emerald-500",
    bgSoft: "bg-emerald-500/10",
    text: "text-emerald-300",
    ring: "ring-emerald-500/30",
    gradient: "from-emerald-500 to-teal-400",
  },
  amber: {
    bg: "bg-amber-500",
    bgSoft: "bg-amber-500/10",
    text: "text-amber-300",
    ring: "ring-amber-500/30",
    gradient: "from-amber-500 to-orange-400",
  },
  rose: {
    bg: "bg-rose-500",
    bgSoft: "bg-rose-500/10",
    text: "text-rose-300",
    ring: "ring-rose-500/30",
    gradient: "from-rose-500 to-pink-500",
  },
  violet: {
    bg: "bg-violet-500",
    bgSoft: "bg-violet-500/10",
    text: "text-violet-300",
    ring: "ring-violet-500/30",
    gradient: "from-violet-500 to-purple-500",
  },
  teal: {
    bg: "bg-teal-500",
    bgSoft: "bg-teal-500/10",
    text: "text-teal-300",
    ring: "ring-teal-500/30",
    gradient: "from-teal-500 to-emerald-400",
  },
  fuchsia: {
    bg: "bg-fuchsia-500",
    bgSoft: "bg-fuchsia-500/10",
    text: "text-fuchsia-300",
    ring: "ring-fuchsia-500/30",
    gradient: "from-fuchsia-500 to-pink-500",
  },
};

export function accent(color: string): AccentClasses {
  return MAP[color] ?? MAP.indigo;
}
