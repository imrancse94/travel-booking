'use client';

import { forwardRef, useId } from 'react';
import './FormField.css';

/** Multi-line text input with label + error-message support. */
export const Textarea = forwardRef(function Textarea(
  { label, error, hint, className = '', containerClassName = '', required, id, rows = 4, ...rest },
  ref
) {
  const generatedId = useId();
  const textareaId = id || rest.name || generatedId;
  return (
    <div className={`form-field ${containerClassName}`}>
      {label && (
        <label className="form-field__label" htmlFor={textareaId}>
          {label}
          {required && <span className="form-field__required">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
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

export default Textarea;
