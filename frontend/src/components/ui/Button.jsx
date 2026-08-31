'use client';

import './Button.css';

const VARIANT_CLASS = {
  primary: 'btn btn--primary',
  secondary: 'btn btn--secondary',
  danger: 'btn btn--danger',
  ghost: 'btn btn--ghost',
};

/**
 * Base button used across the admin UI. Variants: primary/secondary/danger/ghost.
 * Pass `loading` to show a spinner and disable the button while an action is in flight.
 * Pass `as={Link}` (plus the target's own props, e.g. `to`) to render a
 * router link styled as a button -- useful for "+ New X" actions.
 */
export function Button({
  as: Component = 'button',
  variant = 'primary',
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const classes = [VARIANT_CLASS[variant] || VARIANT_CLASS.primary, loading ? 'btn--loading' : '', className]
    .filter(Boolean)
    .join(' ');
  const nativeButtonProps = Component === 'button' ? { type, disabled: disabled || loading } : {};

  return (
    <Component className={classes} {...nativeButtonProps} {...rest}>
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      <span className="btn__label">{children}</span>
    </Component>
  );
}

export default Button;
