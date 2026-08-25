import './Loader.css';

/** Spinner, optionally with a label. Use `inline` to drop the label and size it for inline use (e.g. inside a button/table cell). */
export function Loader({ size = 'md', label = 'Loading...', inline = false }) {
  return (
    <div className={`ui-loader ${inline ? 'ui-loader--inline' : ''}`} role="status" aria-live="polite">
      <span className={`ui-loader__spinner ui-loader__spinner--${size}`} aria-hidden="true" />
      {!inline && <span className="ui-loader__label">{label}</span>}
    </div>
  );
}

export default Loader;
