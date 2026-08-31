import AuthGate from '../../../components/auth/AuthGate.jsx';

// A second, URL-invisible group so the customer's own pages sit behind the
// sign-in gate while still rendering inside CustomerLayout above.
export default function Layout({ children }) {
  return <AuthGate>{children}</AuthGate>;
}
