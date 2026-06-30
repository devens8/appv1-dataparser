import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Semantic tokens driven by CSS variables so the whole UI re-themes
        // between dark and light. The rgb(var / <alpha-value>) form keeps
        // Tailwind's /opacity modifiers working.
        base: "rgb(var(--c-base) / <alpha-value>)",
        panel: "rgb(var(--c-panel) / <alpha-value>)",
        panel2: "rgb(var(--c-panel2) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        fg: "rgb(var(--c-fg) / <alpha-value>)",
        fgmuted: "rgb(var(--c-fgmuted) / <alpha-value>)",
        fgsubtle: "rgb(var(--c-fgsubtle) / <alpha-value>)",
        accent: "rgb(var(--c-accent) / <alpha-value>)",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SF Mono",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(249,115,22,0.1), 0 14px 34px -18px rgba(0,0,0,0.9)",
        lift: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 16px 36px -20px rgba(0,0,0,0.95)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "sweep": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.22s ease-out both",
        "fade-in-up": "fade-in-up 0.4s cubic-bezier(0.16,1,0.3,1) both",
        "scale-in": "scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both",
        "glow-pulse": "glow-pulse 2.4s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
        sweep: "sweep 0.5s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
