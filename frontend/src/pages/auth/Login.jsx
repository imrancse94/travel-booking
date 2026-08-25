import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Button, Card, Input } from '../../components/ui/index.js';
import './auth-pages.css';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/';
  const notice = location.state?.notice || null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <Link to="/" className="auth-page__brand">
          Global Travel Agency
        </Link>
        <Card>
          <h1 className="auth-page__title">Sign in</h1>
          <p className="auth-page__subtitle">Welcome back. Sign in to manage your bookings.</p>

          {notice && <div className="auth-page__success">{notice}</div>}
          {error && <div className="auth-page__error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" loading={isSubmitting} className="auth-page__submit">
              Sign In
            </Button>
          </form>

          <p className="auth-page__footer">
            <Link to="/forgot-password">Forgot password?</Link>
          </p>
          <p className="auth-page__footer">
            No account? <Link to="/register">Create one</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

export default Login;
