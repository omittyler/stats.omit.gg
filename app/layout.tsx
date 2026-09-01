import Link from 'next/link';
import { Inter } from 'next/font/google';
import { getSearchIndex } from '@/lib/standings';
import SiteSearch from '@/components/SiteSearch';
import SiteNav from '@/components/SiteNav';
import 'flag-icons/css/flag-icons.min.css';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'stats.omit.gg',
  description: 'Call of Duty Challengers stats hub',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { teams, players } = await getSearchIndex();

  return (
    <html lang="en" className={inter.variable}>
      <body>
        <header className="site-header">
          <div className="container">
            <Link href="/" className="brand">
              stats.omit.gg
            </Link>
            <SiteSearch teams={teams} players={players} />
            <SiteNav />
          </div>
        </header>
        <div className="attribution-bar">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/x.svg" alt="" width={14} height={14} />
          <span>
            Statistical Data Provided By{' '}
            <a href="https://x.com/ChallengerStats" target="_blank" rel="noopener noreferrer">
              @ChallengerStats
            </a>
          </span>
        </div>
        {children}
      </body>
    </html>
  );
}
