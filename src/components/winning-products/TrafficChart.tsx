import React from 'react';
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { InfoThemeColors } from '@/hooks/useInfoTheme';

interface Props {
  data: { month: string; visits: number }[];
  colors: InfoThemeColors;
}

export const TrafficChart: React.FC<Props> = ({ data, colors }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="rounded-xl border p-4" style={{ background: colors.card, borderColor: colors.border }}>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="trafficGradientThemed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.accent} stopOpacity={0.15} />
              <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={colors.border} strokeDasharray="" vertical horizontal />
          <XAxis
            dataKey="month"
            tick={{ fill: colors.textMuted, fontSize: 12 }}
            axisLine={{ stroke: colors.border }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: colors.textMuted, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              fontSize: 12,
              color: colors.text,
            }}
          />
          <Area
            type="monotone"
            dataKey="visits"
            stroke={colors.text}
            fill="url(#trafficGradientThemed)"
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="h-0.5 mt-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 via-green-400 via-blue-500 to-purple-500" />
    </div>
  );
};
