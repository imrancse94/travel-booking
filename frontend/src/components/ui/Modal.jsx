'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

/**
 * Portal-based modal. Closes on backdrop click or Escape. Render conditionally
 * via `isOpen`; `footer` is an optional slot rendered below the body (used by
 * ConfirmDialog for its action buttons).
 */
export function Modal({ isOpen, onClose, title, children, footer, size = 'md' }) {
  // document.body is unavailable during Next's server render, so the
  // portal waits for the client mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return undefined;
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={`modal-panel modal-panel--${size}`} role="dialog" aria-modal="true" aria-label={title}>
        {title && (
          <div className="modal-panel__header">
            <h3 className="modal-panel__title">{title}</h3>
            <button type="button" className="modal-panel__close" onClick={onClose} aria-label="Close">
              &times;
            </button>
          </div>
        )}
        <div className="modal-panel__body">{children}</div>
        {footer && <div className="modal-panel__footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export default Modal;
