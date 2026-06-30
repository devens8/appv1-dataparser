"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

/**
 * Orange-led palette for a black scientific canvas. The accent (index 0) is the
 * product orange; the rest stay warm but distinguishable, with two cooler hues
 * at the end so multi-series plots remain readable.
 */
export const CHART_PALETTE = [
  "#f97316", // orange (primary accent)
  "#fbbf24", // amber
  "#fb923c", // light orange
  "#f43f5e", // warm red
  "#fde047", // yellow
  "#fca5a5", // soft red
  "#22d3ee", // cyan (contrast)
  "#a3e635", // lime (contrast)
];

export const CHART_TEXT = "#a1a1aa";
export const CHART_GRID = "#27272a";
export const CHART_AXIS = "#3f3f46";

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
      backgroundColor: "rgba(10,10,12,0.97)",
      borderColor: "#f97316",
      borderWidth: 1,
      textStyle: { color: "#e4e4e7", fontSize: 12 },
      extraCssText:
        "box-shadow: 0 12px 40px rgba(0,0,0,0.6); border-radius:3px;",
    },
    toolbox: {
      right: 12,
      top: 6,
      feature: {
        saveAsImage: {
          title: "Export PNG",
          pixelRatio: 3,
          name: "strata-chart",
          backgroundColor: "#0a0a0a",
        },
        dataZoom: { title: { zoom: "Zoom", back: "Reset zoom" } },
        restore: { title: "Restore" },
      },
      iconStyle: { borderColor: CHART_AXIS },
      emphasis: { iconStyle: { borderColor: "#f97316" } },
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
