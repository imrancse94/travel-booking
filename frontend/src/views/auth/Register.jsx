'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, Input } from '../../components/ui/index.js';
import * as authService from '../../services/authService.js';
import { setFlash } from '../../lib/navState.js';
import './auth-pages.css';
import { toastFromApiError, toastFromFieldErrors } from '../../utils/formErrors.js';

const EMPTY_FORM = { firstName: '', lastName: '', email: '', phone: '', password: '' };

export function Register() {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate() {
    const next = {};
    if (!form.firstName.trim()) next.firstName = 'First name is required.';
    if (!form.lastName.trim()) next.lastName = 'Last name is required.';
    if (!form.email.trim()) next.email = 'Email is required.';
    if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      next.password = 'At least 8 characters, with an uppercase letter and a number.';
    }
    setErrors(next);
    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const invalid = validate();
    if (Object.keys(invalid).length > 0) {
      // Returning silently here left the submit button looking inert whenever
      // the offending field was scrolled out of view.
      setError(toastFromFieldErrors(invalid));
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await authService.register(form);
      setFlash(res?.message || 'Account created. You can now sign in.');
      router.push('/login');
    } catch (err) {
      setError(toastFromApiError(err, 'Registration failed'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <Link href="/" className="auth-page__brand">
          Global Travel Agency
        </Link>
        <Card>
          <h1 className="auth-page__title">Create your account</h1>
          <p className="auth-page__subtitle">Register to book hotels and manage your trips.</p>

          {error && <div className="auth-page__error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <Input
                label="First Name"
                required
                value={form.firstName}
                error={errors.firstName}
                onChange={(e) => setField('firstName', e.target.value)}
              />
              <Input
                label="Last Name"
                required
                value={form.lastName}
                error={errors.lastName}
                onChange={(e) => setField('lastName', e.target.value)}
              />
            </div>
            <Input
              label="Email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              error={errors.email}
              onChange={(e) => setField('email', e.target.value)}
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              required
              autoComplete="new-password"
              value={form.password}
              error={errors.password}
              hint="At least 8 characters, with an uppercase letter and a number."
              onChange={(e) => setField('password', e.target.value)}
            />
            <Button type="submit" loading={isSubmitting} className="auth-page__submit">
              Create Account
            </Button>
          </form>

          <p className="auth-page__footer">
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

export default Register;
