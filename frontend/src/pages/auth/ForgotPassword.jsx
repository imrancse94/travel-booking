import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Input } from '../../components/ui/index.js';
import * as authService from '../../services/authService.js';
import './auth-pages.css';

// Server intentionally always returns the same generic message regardless of
// whether the email exists, to avoid leaking which addresses are registered.
// We keep that guarantee on the client too: no branching on the result.
export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await authService.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
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
          <h1 className="auth-page__title">Forgot password</h1>
          <p className="auth-page__subtitle">Enter your email and we'll send you a reset link.</p>

          {submitted ? (
            <div className="auth-page__success">
              If an account exists for that email, a reset link has been sent. Please check your inbox.
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <div className="auth-page__error">{error}</div>}
              <Input
                label="Email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" loading={isSubmitting} className="auth-page__submit">
                Send Reset Link
              </Button>
            </form>
          )}

          <p className="auth-page__footer">
            <Link to="/login">Back to sign in</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

export default ForgotPassword;
