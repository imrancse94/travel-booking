'use client';

import { Provider } from 'react-redux';
import { store } from '../store/store.js';
import { AuthProvider } from '../contexts/AuthContext.jsx';
import { ToastProvider } from '../components/ui/index.js';

/**
 * Everything main.jsx used to wrap around <App/>. It has to be a client
 * component: the Redux store, the session bootstrap and the toast queue are
 * all stateful and browser-only.
 */
export function Providers({ children }) {
  return (
    <Provider store={store}>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </Provider>
  );
}

export default Providers;
