'use client';

import { useId } from 'react';
import './FormField.css';

/**
 * The label / control / message shell every form field shares.
 *
 * Each field component used to repeat this markup, so a change to how a
 * validation message looks -- or is announced to a screen reader -- had to be
 * made in every one of them, and any new field was free to skip it. Now one
 * place owns it and `useFieldIds` wires the accessibility attributes.
 */
export function FormField({ id, label, error, hint, required, containerClassName = '', children }) {
  const message = error || hint;
  return (
    <div className={`form-field ${containerClassName}`}>
      {label && (
        <label className="form-field__label" htmlFor={id}>
          {label}
          {required && <span className="form-field__required">*</span>}
        </label>
      )}
      {children}
      {message && (
        <p
          id={`${id}-message`}
          className={`form-field__message ${error ? 'form-field__message--error' : ''}`}
          // An error appearing after a failed submit has to be announced; a
          // static hint would only be noise if it were.
          role={error ? 'alert' : undefined}
        >
          {message}
        </p>
      )}
    </div>
  );
}

/**
 * Ids and ARIA for one field: `fieldId` for the label association, and
 * `controlProps` to spread onto the control so assistive tech reads the
 * message and knows the field is invalid.
 */
export function useFieldIds({ id, name, error, hint }) {
  // Fall back to a generated id so the label is always programmatically
  // associated with its control, even when no id/name is passed.
  const generatedId = useId();
  const fieldId = id || name || generatedId;
  return {
    fieldId,
    controlProps: {
      id: fieldId,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error || hint ? `${fieldId}-message` : undefined,
    },
  };
}

export default FormField;
