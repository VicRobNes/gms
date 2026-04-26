import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { db, initStore } from '../lib/store';
import { getCurrentUser, CURRENT_USER_COOKIE } from '../lib/auth';
import { UserSwitch } from '../components/UserSwitch';
import './globals.css';

export const metadata: Metadata = {
  title: 'GMS CRM',
  description: 'A simple CRM — Parties, Opportunities, Activities, Tasks, Users.'
};

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/parties', label: 'Parties' },
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/tasks', label: 'Tasks' }
];

async function switchUser(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  cookies().set(CURRENT_USER_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30
  });
  revalidatePath('/', 'layout');
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await initStore();
  const me = getCurrentUser();
  const users = db.users.list();
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <div className="brand">
              GMS CRM
              <small>Tourism marketing</small>
            </div>
            <nav>
              {NAV.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="sidebar-user">
              <div className="sidebar-user-name">{me.name}</div>
              <div className="sidebar-user-role">{me.role}</div>
              <UserSwitch users={users} currentId={me.id} action={switchUser} />
            </div>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
