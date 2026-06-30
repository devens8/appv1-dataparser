"use client";

import { useEffect } from "react";
import { useUiStore } from "@/store/ui";

/** Applies the persisted theme as a class on <html> (dark by default). */
export default function ThemeProvider() {
  const theme = useUiStore((s) => s.theme);
  const hydrated = useUiStore((s) => s.hydrated);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
  }, [theme, hydrated]);

  return null;
}
