"use client";

import { useId } from "react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart, Line } from 'recharts';
import type { ChartPoint } from './PerformanceChartClient';

type OverlayConfig = {
  label: string;
  reverseYAxis?: boolean;
  yAxisFormatter?: (value: number) => string;
  color?: string;
};

type PerformanceChartProps = {
  data: ChartPoint[];
  primaryLabel?: string;
  primaryColor?: string;
  reverseYAxis?: boolean;
  yAxisFormatter?: (value: number) => string;
  overlay?: OverlayConfig;
};

const defaultFormatter = (value: number) => `${value.toFixed(1)}s`;
const defaultSecondaryFormatter = (value: number) => `${value.toFixed(2)}`;
const SECONDARY_COLOR = '#FF6B9A';

type TooltipContentProps = {
  active?: boolean;
  payload?: Array<{ payload?: ChartPoint }>;
  primaryLabel?: string;
  secondaryLabel?: string;
  secondaryColor?: string;
};

const ChartTooltip = ({ active, payload, primaryLabel, secondaryLabel, secondaryColor = SECONDARY_COLOR }: TooltipContentProps) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-white/10 bg-[#0A0F1D] px-4 py-3 text-sm text-white">
      <p className="text-xs text-gray-400 mb-2">{point.meet}</p>
      <div className="space-y-1">
        <div className="text-[#00F0FF]">
          {primaryLabel ? <span className="text-gray-400 mr-1">{primaryLabel}:</span> : null}
          {point.tooltip}
        </div>
        {secondaryLabel && point.secondaryTooltip ? (
          <div style={{ color: secondaryColor }}>
            <span className="text-gray-400 mr-1">{secondaryLabel}:</span>
            {point.secondaryTooltip}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export function PerformanceChart({ data, primaryLabel, primaryColor, reverseYAxis = true, yAxisFormatter, overlay }: PerformanceChartProps) {
  const formatter = yAxisFormatter ?? defaultFormatter;
  const secondaryFormatter = overlay?.yAxisFormatter ?? defaultSecondaryFormatter;
  const hasSecondary = Boolean(overlay) && data.some((point) => point.secondaryValue !== undefined);
  const overlayColor = overlay?.color ?? SECONDARY_COLOR;
  const gradientId = useId();
  const areaColor = primaryColor ?? "#00F0FF";

  return (
    <div className="h-[300px] w-full min-w-0 mt-6">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={areaColor} stopOpacity={0.4}/>
              <stop offset="95%" stopColor={areaColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="axisLabel"
            stroke="rgba(255,255,255,0.3)"
            fontSize={12}
            tickMargin={10}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="primary"
            domain={['dataMin - 1', 'dataMax + 1']}
            reversed={reverseYAxis}
            stroke="rgba(255,255,255,0.3)"
            fontSize={12}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => formatter(Number(value))}
          />
          {hasSecondary ? (
            <YAxis
              yAxisId="secondary"
              orientation="right"
              domain={['auto', 'auto']}
              reversed={overlay?.reverseYAxis ?? false}
              stroke="rgba(255,255,255,0.3)"
              fontSize={12}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => secondaryFormatter(Number(value))}
            />
          ) : null}
          <Tooltip
            content={
              <ChartTooltip
                primaryLabel={primaryLabel}
                secondaryLabel={hasSecondary ? overlay?.label : undefined}
                secondaryColor={overlayColor}
              />
            }
            cursor={{ stroke: 'rgba(255,255,255,0.2)' }}
          />
          <Area
            yAxisId="primary"
            type="monotone"
            dataKey="value"
            stroke={areaColor}
            strokeWidth={3}
            fillOpacity={1}
            fill={`url(#${gradientId})`}
            activeDot={{ r: 6, fill: '#0A0F1D', stroke: areaColor, strokeWidth: 3 }}
          />
          {hasSecondary ? (
            <Line
              yAxisId="secondary"
              type="monotone"
              dataKey="secondaryValue"
              stroke={overlayColor}
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, stroke: overlayColor, fill: '#0A0F1D' }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
