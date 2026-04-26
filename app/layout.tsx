import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'GMS CRM',
  description: 'A simple CRM for managing contacts and deals.'
};

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/parties', label: 'Parties' },
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/tasks', label: 'Tasks' }
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
