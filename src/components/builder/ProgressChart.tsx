import React from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Dot } from 'recharts';
import { addDays, format } from 'date-fns';
import { ChartConfig } from '@/types/quiz';
import { Check, Circle } from 'lucide-react';

interface ProgressChartProps {
  config: ChartConfig;
  primaryColor?: string;
}

// Custom dot component for data points
const CustomDot = (props: any) => {
  const { cx, cy, index, dataLength } = props;
  if (cx === undefined || cy === undefined) return null;
  
  const isFirst = index === 0;
  const isLast = index === dataLength - 1;
  
  let fillColor = '#eab308'; // yellow for middle points
  if (isFirst) fillColor = '#ef4444'; // red
  if (isLast) fillColor = '#22c55e'; // green
  
  return (
    <g>
      {/* Glow effect for first and last points */}
      {(isFirst || isLast) && (
        <circle
          cx={cx}
          cy={cy}
          r={12}
          fill={fillColor}
          opacity={0.2}
        />
      )}
      {/* White border */}
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill="white"
        stroke={fillColor}
        strokeWidth={0}
      />
      {/* Main dot */}
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={fillColor}
        stroke="white"
        strokeWidth={2}
      />
    </g>
  );
};

export const ProgressChart: React.FC<ProgressChartProps> = ({ config, primaryColor = '#0066FF' }) => {
  const today = new Date();
  
  // Sort points by daysFromStart and prepare chart data
  const sortedPoints = [...config.points].sort((a, b) => a.daysFromStart - b.daysFromStart);
  
  const chartData = sortedPoints.map((point, index) => {
    const date = addDays(today, point.daysFromStart);
    return {
      date: point.daysFromStart === 0 ? 'Today' : format(date, 'MMM d'),
      value: point.value,
      label: point.label,
      daysFromStart: point.daysFromStart,
      index,
      dataLength: sortedPoints.length,
    };
  });

  // Get unique Y-axis labels for ticks
  const yAxisTicks = [...new Set(sortedPoints.map(p => p.value))].sort((a, b) => b - a);
  const yAxisLabels = sortedPoints.reduce((acc, p) => {
    acc[p.value] = p.label;
    return acc;
  }, {} as Record<number, string>);

  return (
    <div className="w-full">
      {/* Badges */}
      <div className="flex justify-between items-center mb-3 px-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm" 
          style={{ backgroundColor: '#dc2626', color: 'white' }}>
          <Circle className="w-2 h-2 fill-current" />
          {config.startLabel}
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm" 
          style={{ backgroundColor: '#16a34a', color: 'white' }}>
          <Check className="w-3 h-3" strokeWidth={3} />
          {config.goalLabel}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
          <defs>
            <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
            <linearGradient id="fillGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.1} />
              <stop offset="50%" stopColor="#eab308" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <CartesianGrid 
            horizontal={true}
            vertical={false}
            stroke="#F3F4F6"
            strokeDasharray="4 4"
          />
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 400 }}
            dy={8}
          />
          <YAxis 
            domain={[0, 100]}
            ticks={yAxisTicks}
            tickFormatter={(value) => yAxisLabels[value] || ''}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }}
            width={65}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="url(#colorGradient)"
            strokeWidth={2.5}
            fill="url(#fillGradient)"
            dot={(props) => <CustomDot {...props} dataLength={chartData.length} />}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
