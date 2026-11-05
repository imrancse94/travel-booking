'use client';

import './Icon.css';

/**
 * Icon from the Material Symbols font (loaded in app/layout.jsx). `name` is the
 * ligature, e.g. <Icon name="home" />; browse names at
 * https://fonts.google.com/icons. Inherits colour and (by default) font size
 * from its parent, so it follows the text it sits in. Decorative by default.
 *
 * The font (src/fonts/material-symbols.woff2) is a SUBSET holding only the icons
 * in use, so an unlisted name renders as plain text. To add icons, follow
 * src/fonts/README.md.
 */
export function Icon({ name, size, className = '', ...rest }) {
  return (
    <span
      className={`icon ${className}`}
      style={size ? { fontSize: size } : undefined}
      aria-hidden="true"
      {...rest}
    >
      {name}
    </span>
  );
}

export default Icon;
