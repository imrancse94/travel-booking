import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartTooltip } from './ChartTooltip.jsx';
import { CATEGORICAL_COLORS, CHART_SURFACE } from './chartTheme.js';
import './charts.css';

/**
 * Donut chart for proportion-of-whole breakdowns with a small, fixed number
 * of categories (e.g. payment methods). Slices are direct-labeled with their
 * share so identity never depends on hue alone.
 */
export function PieChartCard({ data, dataKey = 'value', nameKey = 'name', height = 280, valueFormatter }) {
  if (!data || data.length === 0) {
    return <div className="chart-empty">No data for this period.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Tooltip content={<ChartTooltip formatValue={valueFormatter} />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length]} stroke={CHART_SURFACE} strokeWidth={2} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

export default PieChartCard;
