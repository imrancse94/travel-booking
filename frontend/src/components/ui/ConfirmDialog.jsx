'use client';

import { Modal } from './Modal.jsx';
import { Button } from './Button.jsx';

/**
 * Confirmation dialog built on Modal. Use before any destructive action
 * (delete, cancel booking, refund, etc). `tone` picks the confirm button's
 * variant (defaults to danger).
 */
export function ConfirmDialog({
  isOpen,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {typeof message === 'string' ? <p className="confirm-dialog__message">{message}</p> : message}
    </Modal>
  );
}

export default ConfirmDialog;
