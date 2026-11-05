'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { safeRedirectTarget, takeFlash } from '../../lib/navState.js';
import { BrandMark, Button, Card, Input } from '../../components/ui/index.js';
import './auth-pages.css';

export function Login({ demoAccounts = null }) {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = safeRedirectTarget(searchParams.get('from'));

  // Read-and-clear, so the notice shows once and does not survive a reload.
  const [notice, setNotice] = useState(null);
  useEffect(() => {
    setNotice(takeFlash());
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const signedIn = await login(email, password);
      // Staff (any role other than Customer) land on the admin dashboard and
      // customers on My Bookings; an
      // explicit ?from= target (e.g. a deep link that bounced to login) wins.
      const isStaff = Boolean(signedIn?.roles?.some((role) => role !== 'Customer'));
      router.replace(searchParams.get('from') ? from : isStaff ? '/admin/dashboard' : '/my-bookings');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-page__stack">
        <Link href="/" className="auth-page__brand">
          <BrandMark />
        </Link>
        <div className="auth-page__row">
          <div className="auth-page__card">
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
                <Link href="/forgot-password">Forgot password?</Link>
              </p>
              <p className="auth-page__footer">
                No account? <Link href="/register">Create one</Link>
              </p>
            </Card>
          </div>

          {demoAccounts && (
            <div className="auth-page__demo">
              <p className="auth-page__demo-title">Demo accounts</p>
              {demoAccounts.map((account) => (
                <div key={account.email} className="auth-page__demo-account">
                  <div>
                    <p className="auth-page__demo-role">{account.label}</p>
                    <p className="auth-page__demo-cred">
                      {account.email} / {account.password}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEmail(account.email);
                      setPassword(account.password);
                    }}
                  >
                    Use
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
