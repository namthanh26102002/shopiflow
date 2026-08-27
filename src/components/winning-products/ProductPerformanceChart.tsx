import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import type { InfoThemeColors } from '@/hooks/useInfoTheme';

interface Props {
  performance: Record<string, number>;
  colors: InfoThemeColors;
}

const LABELS: Record<string, string> = {
  trend: 'TREND SCORE',
  saturation: 'MARKET SATURATION',
  competition: 'COMPETITION',
  profit_margin: 'PROFIT MARGIN',
  growth_rate: 'GROWTH RATE',
};

const CustomAngleTick = ({ payload, x, y, cx, cy, themeColors, ...rest }: any) => {
  const dataItem = rest?.payload;
  const value = dataItem?.rawValue ?? dataItem?.value ?? '';

  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const offsetFactor = 28 / (dist || 1);
  const ox = x + dx * offsetFactor;
  const oy = y + dy * offsetFactor;

  return (
    <g>
      <text x={ox} y={oy - 12} textAnchor="middle" dominantBaseline="central" fill={themeColors.accent} fontSize={14} fontWeight={700}>
        {value}
      </text>
      <text x={ox} y={oy + 6} textAnchor="middle" dominantBaseline="central" fill={themeColors.textMuted} fontSize={10} fontWeight={500} letterSpacing="0.05em">
        {payload.value}
      </text>
    </g>
  );
};

export const ProductPerformanceChart: React.FC<Props> = ({ performance, colors }) => {
  const data = Object.entries(performance).map(([key, value]) => ({
    metric: LABELS[key] || key,
    value: Number(value) * 20,
    rawValue: Number(value),
    fullMark: 100,
  }));

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="60%">
        <PolarGrid stroke={colors.border} strokeDasharray="3 3" />
        <PolarAngleAxis dataKey="metric" tick={<CustomAngleTick themeColors={colors} />} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name="Performance"
          dataKey="value"
          stroke={colors.accent}
          fill={colors.accent}
          fillOpacity={0.15}
          strokeWidth={2}
          dot={{ r: 4, fill: colors.accent, stroke: colors.accent }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};
