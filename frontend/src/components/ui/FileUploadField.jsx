'use client';

import { useRef, useState } from 'react';
import { FormField, useFieldIds } from './FormField.jsx';
import { TrashIcon } from './icons.jsx';
import './FileUploadField.css';

const DEFAULT_ACCEPT = 'image/png,image/jpeg,image/webp';

/**
 * Click-or-drop image uploader with an inline preview.
 *
 * `onUpload(file)` does the actual upload and resolves to the stored URL;
 * this component owns only the picking, the drag state and the preview, so
 * the same field works for a logo, a hotel photo or anything else.
 */
export function FileUploadField({
  label,
  value,
  onChange,
  onUpload,
  accept = DEFAULT_ACCEPT,
  // 'circle' is for identity marks (agency logo, favicon) so they match the
  // circular treatment BrandMark renders them with everywhere else in the app.
  previewShape = 'square',
  hint = 'PNG, JPEG or WebP, up to 5MB',
  error,
  required,
  disabled = false,
  containerClassName = '',
  alt = 'Uploaded image',
  name,
  id,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [failure, setFailure] = useState(null);
  const { fieldId, controlProps } = useFieldIds({ id, name, error: error || failure, hint });

  async function accept_(file) {
    if (!file || disabled) return;
    setFailure(null);
    setUploading(true);
    try {
      onChange(await onUpload(file));
    } catch (err) {
      setFailure(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    accept_(e.dataTransfer.files?.[0]);
  }

  function open() {
    if (!disabled && !uploading) inputRef.current?.click();
  }

  const state = [
    'file-upload',
    dragging ? 'file-upload--dragging' : '',
    disabled ? 'file-upload--disabled' : '',
    error || failure ? 'file-upload--error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <FormField
      id={fieldId}
      label={label}
      error={error || failure}
      hint={hint}
      required={required}
      containerClassName={containerClassName}
    >
      <div
        className={state}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          {...controlProps}
          ref={inputRef}
          type="file"
          name={name}
          accept={accept}
          disabled={disabled || uploading}
          className="file-upload__input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            // Reset first, so re-picking the same file still fires a change.
            e.target.value = '';
            accept_(file);
          }}
        />

        {value ? (
          <div className="file-upload__filled">
            <img
              src={value}
              alt={alt}
              className={`file-upload__preview ${previewShape === 'circle' ? 'file-upload__preview--circle' : ''}`}
            />
            <div className="file-upload__filled-actions">
              <button type="button" className="file-upload__link" onClick={open} disabled={disabled || uploading}>
                {uploading ? 'Uploading...' : 'Replace'}
              </button>
              <button
                type="button"
                className="file-upload__link file-upload__link--danger"
                onClick={() => onChange('')}
                disabled={disabled || uploading}
              >
                <TrashIcon width="14" height="14" />
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="file-upload__dropzone" onClick={open} disabled={disabled || uploading}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="m7 9 5-5 5 5" />
              <path d="M12 4v12" />
            </svg>
            <span className="file-upload__prompt">
              {uploading ? 'Uploading...' : <><strong>Click to upload</strong> or drag and drop</>}
            </span>
          </button>
        )}
      </div>
    </FormField>
  );
}

export default FileUploadField;
