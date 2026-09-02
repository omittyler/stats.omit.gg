'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/standings', label: 'Standings' },
  { href: '/players', label: 'Players' },
  { href: '/teams', label: 'Top Teams' },
  { href: '/cdl-teams', label: 'CDL Teams' },
];

export default function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="nav-toggle"
        aria-label="Toggle navigation menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>
      <nav className={open ? 'site-nav open' : 'site-nav'}>
        {LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link key={link.href} href={link.href} className={active ? 'active' : ''} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
