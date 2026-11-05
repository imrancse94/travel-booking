'use client';

import { forwardRef, useId } from 'react';
import './FormField.css';

/**
 * Select with label + error-message support. Pass `options={[{value,label}]}`
 * and/or raw `<option>` children, plus an optional `placeholder` for the blank option.
 */
export const Select = forwardRef(function Select(
  { label, error, hint, options = [], placeholder, className = '', containerClassName = '', required, id, children, ...rest },
  ref
) {
  const generatedId = useId();
  const selectId = id || rest.name || generatedId;
  return (
    <div className={`form-field ${containerClassName}`}>
      {label && (
        <label className="form-field__label" htmlFor={selectId}>
          {label}
          {required && <span className="form-field__required">*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={`form-field__control form-field__control--select ${error ? 'form-field__control--error' : ''} ${className}`}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        {children}
      </select>
      {error ? (
        <p className="form-field__message form-field__message--error">{error}</p>
      ) : hint ? (
        <p className="form-field__message">{hint}</p>
      ) : null}
    </div>
  );
});

export default Select;
