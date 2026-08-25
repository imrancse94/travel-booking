import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, Input } from '../../components/ui/index.js';
import * as authService from '../../services/authService.js';
import './auth-pages.css';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must be at least 8 characters, with an uppercase letter and a number.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      await authService.resetPassword(token, password);
      navigate('/login', { state: { notice: 'Password reset. You can now sign in with your new password.' } });
    } catch (err) {
      setError(err.message || 'Could not reset password. The link may have expired.');
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
          <h1 className="auth-page__title">Reset password</h1>
          <p className="auth-page__subtitle">Choose a new password for your account.</p>

          {!token && <div className="auth-page__error">This reset link is missing its token. Request a new one.</div>}
          {error && <div className="auth-page__error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <Input
              label="New Password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              hint="At least 8 characters, with an uppercase letter and a number."
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              label="Confirm New Password"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button type="submit" loading={isSubmitting} disabled={!token} className="auth-page__submit">
              Reset Password
            </Button>
          </form>

          <p className="auth-page__footer">
            <Link to="/login">Back to sign in</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

export default ResetPassword;
