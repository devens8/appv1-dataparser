"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

/** Brightened palette tuned for a dark scientific canvas. */
export const CHART_PALETTE = [
  "#38bdf8", // sky
  "#818cf8", // indigo
  "#34d399", // emerald
  "#fbbf24", // amber
  "#f87171", // rose
  "#a78bfa", // violet
  "#2dd4bf", // teal
  "#f472b6", // fuchsia
];

export const CHART_TEXT = "#94a3b8";
export const CHART_GRID = "#1e293b";
export const CHART_AXIS = "#334155";

/** Common scientific styling merged into every chart option (dark theme). */
export function baseChartTheme(): echarts.EChartsOption {
  return {
    color: CHART_PALETTE,
    textStyle: {
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      color: CHART_TEXT,
    },
    grid: { left: 56, right: 24, top: 36, bottom: 48, containLabel: true },
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(12,19,34,0.96)",
      borderColor: CHART_GRID,
      borderWidth: 1,
      textStyle: { color: "#e2e8f0", fontSize: 12 },
      extraCssText:
        "box-shadow: 0 12px 40px rgba(0,0,0,0.55); border-radius:10px; backdrop-filter: blur(6px);",
    },
    toolbox: {
      right: 12,
      top: 6,
      feature: {
        saveAsImage: {
          title: "Export PNG",
          pixelRatio: 3,
          name: "strata-chart",
          backgroundColor: "#0c1322",
        },
        dataZoom: { title: { zoom: "Zoom", back: "Reset zoom" } },
        restore: { title: "Restore" },
      },
      iconStyle: { borderColor: CHART_AXIS },
      emphasis: { iconStyle: { borderColor: "#38bdf8" } },
    },
  };
}

interface ChartProps {
  option: echarts.EChartsOption;
  height?: number | string;
  className?: string;
}

export default function Chart({ option, height = 380, className }: ChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    inst.current = echarts.init(ref.current, undefined, {
      renderer: "canvas",
    });
    const onResize = () => inst.current?.resize();
    window.addEventListener("resize", onResize);

    // Observe container size changes (sidebar collapse, tab switches).
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
    const merged = echarts.util.merge(
      baseChartTheme(),
      option,
      true,
    ) as echarts.EChartsOption;
    inst.current.setOption(merged, true);
  }, [option]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ width: "100%", height }}
    />
  );
}
