import './charts.css';

/** Shared recharts <Tooltip content={...}/> renderer so every chart's tooltip looks the same. */
export function ChartTooltip({ active, payload, label, formatValue }) {
  if (!active || !payload?.length) return null;
  const format = formatValue || ((v) => v);
  return (
    <div className="chart-tooltip">
      {label != null && <div className="chart-tooltip__label">{label}</div>}
      {payload.map((entry) => (
        <div key={entry.dataKey || entry.name} className="chart-tooltip__row">
          <span className="chart-tooltip__swatch" style={{ background: entry.color || entry.fill }} />
          <span className="chart-tooltip__name">{entry.name}</span>
          <span className="chart-tooltip__value">{format(entry.value, entry)}</span>
        </div>
      ))}
    </div>
  );
}

export default ChartTooltip;
