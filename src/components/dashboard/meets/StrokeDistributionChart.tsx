"use client";

import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Cell,
} from "recharts";

type DistributionPoint = {
  stroke: string;
  label: string;
  count: number;
  best: string;
};

type StrokeDistributionChartProps = {
  data: DistributionPoint[];
  onSelectStroke?: (stroke: string) => void;
  activeStroke?: string | null;
};

const COLORS = ["#00F0FF", "#00FF85", "#FFD166", "#F15BB5", "#9B5DE5"];
const STROKE_COLORS: Record<string, string> = {
  FREESTYLE: "#00F0FF",
  BACKSTROKE: "#00FF85",
  BREASTSTROKE: "#FFD166",
  BUTTERFLY: "#F15BB5",
  MEDLEY: "#9B5DE5",
};

type TooltipProps = {
  active?: boolean;
  payload?: { payload: DistributionPoint }[] | null;
};

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload as DistributionPoint;
  return (
    <div className="bg-[#0A0F1D] border border-white/10 rounded-lg px-3 py-2 text-sm">
      <p className="text-white font-semibold">{item.label}</p>
      <p className="text-gray-400">#{item.count}</p>
      <p className="text-[#00F0FF] text-xs mt-1">PB {item.best}</p>
    </div>
  );
};

export function StrokeDistributionChart({ data, onSelectStroke, activeStroke }: StrokeDistributionChartProps) {
  const isInteractive = typeof onSelectStroke === "function";

  return (
    <div className="h-80 min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} barCategoryGap="4%" barGap={6} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar dataKey="count" radius={[10, 10, 0, 0]} barSize={64} maxBarSize={84}>
            {data.map((entry, index) => (
              <Cell
                key={entry.stroke}
                fill={STROKE_COLORS[entry.stroke] ?? COLORS[index % COLORS.length]}
                cursor={isInteractive ? "pointer" : "default"}
                opacity={activeStroke && activeStroke !== entry.stroke ? 0.4 : 1}
                onClick={() => onSelectStroke?.(entry.stroke)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

