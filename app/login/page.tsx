'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { ApiError } from '../../lib/api';

const DEMO_EMAILS = [
  'owner@summittrails.example',
  'admin@summittrails.example',
  'agent@summittrails.example',
  'analyst@summittrails.example'
];

export default function LoginPage() {
  const { signIn, session, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('owner@summittrails.example');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && session) router.replace('/dashboard');
  }, [isLoading, router, session]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <h1>Tourism CRM</h1>
        <p className="subtitle">Sign in with a seeded demo account.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 18 }}
            disabled={submitting}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="demo-list">
          <p style={{ marginBottom: 6 }}>Try a seeded user:</p>
          {DEMO_EMAILS.map((demo) => (
            <div key={demo} style={{ marginBottom: 4 }}>
              <code onClick={() => setEmail(demo)}>{demo}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
