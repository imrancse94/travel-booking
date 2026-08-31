'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartTooltip } from './ChartTooltip.jsx';
import { CATEGORICAL_COLORS, CHART_GRID_COLOR, CHART_TEXT_COLOR } from './chartTheme.js';
import './charts.css';

/**
 * Single- or multi-series line chart (e.g. revenue/bookings over time).
 * `series`: [{ key, label, color? }] -- colors default to the fixed
 * categorical order in chartTheme.js so charts stay consistent across the app.
 */
export function LineChartCard({ data, series, xKey, height = 280, valueFormatter }) {
  if (!data || data.length === 0) {
    return <div className="chart-empty">No data for this period.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART_GRID_COLOR} vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fill: CHART_TEXT_COLOR, fontSize: 12 }}
          axisLine={{ stroke: CHART_GRID_COLOR }}
          tickLine={false}
        />
        <YAxis tick={{ fill: CHART_TEXT_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} width={48} />
        <Tooltip content={<ChartTooltip formatValue={valueFormatter} />} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color || CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export default LineChartCard;
