import { forwardRef } from 'react';
import './FormField.css';

/** Text input with label + error-message support, styled via the shared .form-field classes. */
export const Input = forwardRef(function Input(
  { label, error, hint, className = '', containerClassName = '', required, id, ...rest },
  ref
) {
  const inputId = id || rest.name;
  return (
    <div className={`form-field ${containerClassName}`}>
      {label && (
        <label className="form-field__label" htmlFor={inputId}>
          {label}
          {required && <span className="form-field__required">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`form-field__control ${error ? 'form-field__control--error' : ''} ${className}`}
        {...rest}
      />
      {error ? (
        <p className="form-field__message form-field__message--error">{error}</p>
      ) : hint ? (
        <p className="form-field__message">{hint}</p>
      ) : null}
    </div>
  );
});

export default Input;
