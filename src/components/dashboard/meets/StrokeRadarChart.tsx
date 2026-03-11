"use client";

import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from "recharts";

type RadarMode = "time" | "technical" | "both";

type RadarPoint = {
  stroke: string;
  label: string;
  timeScore?: number;
  technicalScore?: number;
  timeValue?: number;
  technicalValue?: number;
};

type StrokeRadarChartProps = {
  data: RadarPoint[];
  mode: RadarMode;
  timeFormatter: (value: number) => string;
  technicalFormatter: (value: number) => string;
  timeColor?: string;
  technicalColor?: string;
};

type TooltipPayload = {
  payload?: RadarPoint;
};

const CustomTooltip = ({
  active,
  payload,
  mode,
  timeFormatter,
  technicalFormatter,
  timeColor,
  technicalColor,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  mode: RadarMode;
  timeFormatter: (value: number) => string;
  technicalFormatter: (value: number) => string;
  timeColor: string;
  technicalColor: string;
}) => {
  if (!active || !payload?.length || !payload[0]?.payload) return null;
  const point = payload[0].payload;

  return (
    <div className="bg-[#0A0F1D] border border-white/10 rounded-lg px-3 py-2 text-sm">
      <p className="text-white font-semibold">{point.label}</p>
      {(mode === "time" || mode === "both") && point.timeValue !== undefined ? (
        <p style={{ color: timeColor }}>Tempo: {timeFormatter(point.timeValue)}</p>
      ) : null}
      {(mode === "technical" || mode === "both") && point.technicalValue !== undefined ? (
        <p style={{ color: technicalColor }}>Índice técnico: {technicalFormatter(point.technicalValue)}</p>
      ) : null}
      <p className="text-xs text-gray-500 mt-1">Maior área = melhor desempenho relativo</p>
    </div>
  );
};

export function StrokeRadarChart({
  data,
  mode,
  timeFormatter,
  technicalFormatter,
  timeColor = "#FFD166",
  technicalColor = "#00F0FF",
}: StrokeRadarChartProps) {
  return (
    <div className="h-72 min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <RadarChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }} />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${Math.round(Number(value))}%`}
          />
          <Tooltip
            content={
              <CustomTooltip
                mode={mode}
                timeFormatter={timeFormatter}
                technicalFormatter={technicalFormatter}
                timeColor={timeColor}
                technicalColor={technicalColor}
              />
            }
          />
          {(mode === "time" || mode === "both") ? (
            <Radar dataKey="timeScore" stroke={timeColor} fill={timeColor} fillOpacity={mode === "both" ? 0.16 : 0.35} />
          ) : null}
          {(mode === "technical" || mode === "both") ? (
            <Radar dataKey="technicalScore" stroke={technicalColor} fill={technicalColor} fillOpacity={mode === "both" ? 0.2 : 0.35} />
          ) : null}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
