'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartTooltip } from './ChartTooltip.jsx';
import { CATEGORICAL_COLORS, CHART_GRID_COLOR, CHART_TEXT_COLOR } from './chartTheme.js';
import './charts.css';

/**
 * Bar chart for magnitude comparison. Use `horizontal` for ranked-category
 * charts (top hotels, top destinations) and the default vertical layout for
 * time-series/trend bars. `series`: [{ key, label, color? }].
 */
export function BarChartCard({ data, series, xKey, height = 280, horizontal = false, valueFormatter }) {
  if (!data || data.length === 0) {
    return <div className="chart-empty">No data for this period.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid stroke={CHART_GRID_COLOR} horizontal={!horizontal} vertical={horizontal} />
        {horizontal ? (
          <XAxis type="number" tick={{ fill: CHART_TEXT_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} />
        ) : (
          <XAxis
            dataKey={xKey}
            tick={{ fill: CHART_TEXT_COLOR, fontSize: 12 }}
            axisLine={{ stroke: CHART_GRID_COLOR }}
            tickLine={false}
          />
        )}
        {horizontal ? (
          <YAxis
            type="category"
            dataKey={xKey}
            tick={{ fill: CHART_TEXT_COLOR, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={130}
          />
        ) : (
          <YAxis tick={{ fill: CHART_TEXT_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} width={48} />
        )}
        <Tooltip content={<ChartTooltip formatValue={valueFormatter} />} cursor={{ fill: 'rgba(37,99,235,0.06)' }} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={s.color || CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length]}
            radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            maxBarSize={36}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export default BarChartCard;
