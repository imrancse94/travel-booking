import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './Toast.css';

const ToastContext = createContext(null);
let idSeq = 0;

/**
 * Wrap the app (or the admin section) in <ToastProvider> once, then call
 * useToast().show(message, type) from anywhere to stack a dismissible,
 * auto-expiring notification. type: 'success' | 'error' | 'info' | 'warning'.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (message, type = 'info', duration = 4000) => {
      const id = ++idSeq;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss]
  );

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="toast-stack" aria-live="assertive">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast--${t.type}`}>
              <span className="toast__message">{t.message}</span>
              <button type="button" className="toast__close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                &times;
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

export default ToastProvider;
