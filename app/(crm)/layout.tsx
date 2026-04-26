'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/leads', label: 'Leads' },
  { href: '/contacts', label: 'Contacts' },
  { href: '/trips', label: 'Trips' },
  { href: '/campaigns', label: 'Campaigns' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/team', label: 'Team' }
];

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const { session, isLoading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !session) router.replace('/login');
  }, [isLoading, router, session]);

  if (isLoading || !session) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Loading workspace…</span>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          Tourism CRM
          <small>{session.organization.name}</small>
        </div>
        <nav>
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={active ? 'active' : ''}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="user">
          <div className="name">{session.user.name}</div>
          <div className="role">{session.user.role}</div>
          <button type="button" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
