import { Inter } from 'next/font/google';
import { getSearchIndex, getTeamLogos } from '@/lib/standings';
import { getRecentMatches } from '@/lib/matches';
import SiteSearch from '@/components/SiteSearch';
import SiteNav from '@/components/SiteNav';
import RecentMatchesBanner from '@/components/RecentMatchesBanner';
import LoadingScreen from '@/components/LoadingScreen';
import LegacyQueryRedirect from '@/components/LegacyQueryRedirect';
import 'flag-icons/css/flag-icons.min.css';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  metadataBase: new URL('https://stats.omit.gg'),
  title: 'stats.omit.gg',
  description: 'Call of Duty Challengers stats hub',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { teams, players } = await getSearchIndex();
  const [recentMatches, teamLogos] = await Promise.all([getRecentMatches(12), getTeamLogos()]);

  return (
    <html lang="en" className={inter.variable}>
      <body>
        <LegacyQueryRedirect />
        <LoadingScreen />
        <header className="site-header">
          <div className="container">
            <a href="https://omit.gg" target="_blank" rel="noopener noreferrer" className="site-omit-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/teams/OMiT.png" alt="OMiT" />
            </a>
            <SiteSearch teams={teams} players={players} />
            <SiteNav />
          </div>
        </header>
        <RecentMatchesBanner matches={recentMatches} logos={teamLogos} />
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
