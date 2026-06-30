"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import { useUiStore, type Theme } from "@/store/ui";

/**
 * Orange-led palette. Index 0 is the product orange; the rest stay warm but
 * distinguishable, with two cooler hues so multi-series plots remain readable
 * on both the black canvas and the white "research paper" canvas.
 */
export const CHART_PALETTE = [
  "#f97316", // orange (primary accent)
  "#d97706", // amber-600 (darker than amber so it reads on white too)
  "#fb923c", // light orange
  "#dc2626", // red-600
  "#0891b2", // cyan-600 (contrast)
  "#65a30d", // lime-600 (contrast)
  "#7c3aed", // violet-600
  "#db2777", // pink-600
];

interface ThemeColors {
  text: string;
  textStrong: string;
  axis: string;
  grid: string;
  bg: string;
  exportBg: string;
  tooltipBg: string;
  tooltipText: string;
}

function themeColors(theme: Theme): ThemeColors {
  if (theme === "light") {
    return {
      text: "#3f3f46", // zinc-700
      textStrong: "#18181b", // zinc-900
      axis: "#52525b", // zinc-600
      grid: "#e4e4e7", // zinc-200
      bg: "#ffffff",
      exportBg: "#ffffff",
      tooltipBg: "rgba(255,255,255,0.98)",
      tooltipText: "#18181b",
    };
  }
  return {
    text: "#a1a1aa",
    textStrong: "#e4e4e7",
    axis: "#52525b",
    grid: "#27272a",
    bg: "transparent",
    exportBg: "#0a0a0a",
    tooltipBg: "rgba(10,10,12,0.97)",
    tooltipText: "#e4e4e7",
  };
}

/** Base styling merged under every chart option. */
export function baseChartTheme(t: ThemeColors): echarts.EChartsOption {
  return {
    color: CHART_PALETTE,
    backgroundColor: t.bg,
    textStyle: {
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      color: t.text,
    },
    grid: { left: 56, right: 24, top: 36, bottom: 48, containLabel: true },
    tooltip: {
      trigger: "item",
      backgroundColor: t.tooltipBg,
      borderColor: "#f97316",
      borderWidth: 1,
      textStyle: { color: t.tooltipText, fontSize: 12 },
      extraCssText: "box-shadow: 0 12px 40px rgba(0,0,0,0.25); border-radius:3px;",
    },
    toolbox: {
      right: 12,
      top: 6,
      feature: {
        saveAsImage: {
          title: "Export PNG",
          pixelRatio: 3,
          name: "strata-chart",
          backgroundColor: t.exportBg,
        },
        dataZoom: { title: { zoom: "Zoom", back: "Reset zoom" } },
        restore: { title: "Restore" },
      },
      iconStyle: { borderColor: t.axis },
      emphasis: { iconStyle: { borderColor: "#f97316" } },
    },
  };
}

/**
 * Forced theme overlay applied AFTER the view's option so axis/text/grid colors
 * stay consistent across every chart and re-theme instantly with the toggle —
 * views no longer need to hard-code these.
 */
function themeOverlay(t: ThemeColors): echarts.EChartsOption {
  // Uniform label / title sizing so every chart reads the same.
  const axis = {
    nameTextStyle: { color: t.textStrong, fontSize: 12, fontWeight: 500 as const },
    axisLabel: { color: t.text, fontSize: 11 },
    axisLine: { lineStyle: { color: t.axis } },
    splitLine: { lineStyle: { color: t.grid } },
  };
  return {
    backgroundColor: t.bg,
    textStyle: { color: t.text },
    xAxis: axis,
    yAxis: axis,
    legend: { textStyle: { color: t.text }, inactiveColor: t.grid },
  } as echarts.EChartsOption;
}

interface ChartProps {
  option: echarts.EChartsOption;
  height?: number | string;
  className?: string;
}

export default function Chart({ option, height = 380, className }: ChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    if (!ref.current) return;
    inst.current = echarts.init(ref.current, undefined, { renderer: "canvas" });
    const onResize = () => inst.current?.resize();
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(() => inst.current?.resize());
    ro.observe(ref.current);
    return () => {
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      inst.current?.dispose();
      inst.current = null;
    };
  }, []);

  useEffect(() => {
    if (!inst.current) return;
    const t = themeColors(theme);
    const merged = echarts.util.merge(baseChartTheme(t), option, true);
    const overlaid = echarts.util.merge(
      merged,
      themeOverlay(t),
      true,
    ) as echarts.EChartsOption;
    inst.current.setOption(overlaid, true);
  }, [option, theme]);

  return (
    <div ref={ref} className={className} style={{ width: "100%", height }} />
  );
}
