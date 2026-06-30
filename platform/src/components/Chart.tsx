"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

export const CHART_PALETTE = [
  "#4f46e5",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#ec4899",
];

const BASE_TEXT = "#475569";
const GRID_LINE = "#e2e8f0";
const AXIS_LINE = "#94a3b8";

/** Common scientific styling merged into every chart option. */
export function baseChartTheme(): echarts.EChartsOption {
  return {
    color: CHART_PALETTE,
    textStyle: {
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      color: BASE_TEXT,
    },
    grid: { left: 56, right: 24, top: 36, bottom: 48, containLabel: true },
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(255,255,255,0.97)",
      borderColor: GRID_LINE,
      borderWidth: 1,
      textStyle: { color: "#1e293b", fontSize: 12 },
      extraCssText: "box-shadow: 0 6px 24px rgba(15,23,42,0.12); border-radius:8px;",
    },
    toolbox: {
      right: 12,
      top: 6,
      feature: {
        saveAsImage: {
          title: "Export PNG",
          pixelRatio: 3,
          name: "strata-chart",
        },
        dataZoom: { title: { zoom: "Zoom", back: "Reset zoom" } },
        restore: { title: "Restore" },
      },
      iconStyle: { borderColor: AXIS_LINE },
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
