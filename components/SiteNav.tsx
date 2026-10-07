'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { PREFIXED_GAME_SLUGS } from '@/lib/season';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/standings', label: 'Standings' },
  { href: '/players', label: 'Players' },
  { href: '/matches', label: 'Matches' },
  { href: '/events', label: 'Events' },
  { href: '/teams', label: 'Top Teams' },
  { href: '/cdl-teams', label: 'CDL Teams' },
];

function stripGamePrefix(path: string) {
  for (const slug of PREFIXED_GAME_SLUGS) {
    if (path === `/${slug}`) return '/';
    if (path.startsWith(`/${slug}/`)) return path.slice(slug.length + 1);
  }
  return path;
}

export default function SiteNav() {
  // Non-current games live under a `/<slug>` prefix (lib/season.ts gameHref)
  // and trailingSlash adds a final `/` - strip both so `/mw4/standings/`
  // still highlights Standings.
  const pathname = stripGamePrefix(usePathname().replace(/(.)\/$/, '$1'));
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
