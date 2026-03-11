"use client";

import dynamic from "next/dynamic";

export type ChartPoint = {
  meet: string;
  axisLabel?: string;
  value: number;
  tooltip: string;
  secondaryValue?: number;
  secondaryTooltip?: string;
};

const PerformanceChart = dynamic(
  () => import("./PerformanceChart").then((m) => m.PerformanceChart),
  {
    ssr: false,
    loading: () => <div className="h-[300px] w-full mt-6" />,
  }
);

type OverlayConfig = {
  label: string;
  reverseYAxis?: boolean;
  yAxisFormatter?: (value: number) => string;
  color?: string;
};

type PerformanceChartClientProps = {
  data: ChartPoint[];
  primaryLabel?: string;
  primaryColor?: string;
  reverseYAxis?: boolean;
  yAxisFormatter?: (value: number) => string;
  overlay?: OverlayConfig;
};

export default function PerformanceChartClient({
  data,
  primaryLabel,
  primaryColor,
  reverseYAxis,
  yAxisFormatter,
  overlay,
}: PerformanceChartClientProps) {
  return (
    <PerformanceChart
      data={data}
      primaryLabel={primaryLabel}
      primaryColor={primaryColor}
      reverseYAxis={reverseYAxis}
      yAxisFormatter={yAxisFormatter}
      overlay={overlay}
    />
  );
}

