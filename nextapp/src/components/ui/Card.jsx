'use client';

import './Card.css';

/** Generic surface container with an optional header (title + actions slot). */
export function Card({ title, actions, className = '', children, ...rest }) {
  return (
    <div className={`ui-card ${className}`} {...rest}>
      {(title || actions) && (
        <div className="ui-card__header">
          {title && <h3 className="ui-card__title">{title}</h3>}
          {actions && <div className="ui-card__actions">{actions}</div>}
        </div>
      )}
      <div className="ui-card__body">{children}</div>
    </div>
  );
}

export default Card;
