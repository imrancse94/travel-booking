import { Card } from './Card.jsx';
import './StatCard.css';

/** Dashboard metric tile: label, big value, and an optional hint/delta line and icon. */
export function StatCard({ label, value, hint, tone = 'neutral', icon }) {
  return (
    <Card className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__row">
        {icon && (
          <span className="stat-card__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <div className="stat-card__text">
          <p className="stat-card__label">{label}</p>
          <p className="stat-card__value">{value}</p>
          {hint && <p className="stat-card__hint">{hint}</p>}
        </div>
      </div>
    </Card>
  );
}

export default StatCard;
