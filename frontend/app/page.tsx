'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';

export default function HomePage() {
  const router = useRouter();
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    router.replace(session ? '/dashboard' : '/login');
  }, [isLoading, router, session]);

  return (
    <div className="loading-screen">
      <div className="spinner" />
      <span>Loading workspace…</span>
    </div>
  );
}
