import './Skeleton.css';

/** A single pulsing placeholder block. */
export function Skeleton({ width = '100%', height = '1rem', radius, className = '', style }) {
  return (
    <span
      className={`ui-skeleton ${className}`}
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

/** A stack of skeleton lines, e.g. for a loading card/detail panel. */
export function SkeletonBlock({ rows = 3, className = '' }) {
  return (
    <div className={`ui-skeleton-block ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height="0.9rem" style={{ marginBottom: 'var(--space-2)' }} />
      ))}
    </div>
  );
}

export default Skeleton;
