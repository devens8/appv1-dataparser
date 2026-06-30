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
    bgSoft: "bg-indigo-50",
    text: "text-indigo-600",
    ring: "ring-indigo-200",
    gradient: "from-indigo-500 to-violet-500",
  },
  sky: {
    bg: "bg-sky-500",
    bgSoft: "bg-sky-50",
    text: "text-sky-600",
    ring: "ring-sky-200",
    gradient: "from-sky-500 to-cyan-400",
  },
  emerald: {
    bg: "bg-emerald-500",
    bgSoft: "bg-emerald-50",
    text: "text-emerald-600",
    ring: "ring-emerald-200",
    gradient: "from-emerald-500 to-teal-400",
  },
  amber: {
    bg: "bg-amber-500",
    bgSoft: "bg-amber-50",
    text: "text-amber-600",
    ring: "ring-amber-200",
    gradient: "from-amber-500 to-orange-400",
  },
  rose: {
    bg: "bg-rose-500",
    bgSoft: "bg-rose-50",
    text: "text-rose-600",
    ring: "ring-rose-200",
    gradient: "from-rose-500 to-pink-500",
  },
  violet: {
    bg: "bg-violet-500",
    bgSoft: "bg-violet-50",
    text: "text-violet-600",
    ring: "ring-violet-200",
    gradient: "from-violet-500 to-purple-500",
  },
  teal: {
    bg: "bg-teal-500",
    bgSoft: "bg-teal-50",
    text: "text-teal-600",
    ring: "ring-teal-200",
    gradient: "from-teal-500 to-emerald-400",
  },
  fuchsia: {
    bg: "bg-fuchsia-500",
    bgSoft: "bg-fuchsia-50",
    text: "text-fuchsia-600",
    ring: "ring-fuchsia-200",
    gradient: "from-fuchsia-500 to-pink-500",
  },
};

export function accent(color: string): AccentClasses {
  return MAP[color] ?? MAP.indigo;
}
