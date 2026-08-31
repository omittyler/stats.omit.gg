import Link from 'next/link';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'stats.omit.gg',
  description: 'Call of Duty Challengers stats hub',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <header className="site-header">
          <div className="container">
            <Link href="/" className="brand">
              stats.omit.gg
            </Link>
            <nav>
              <Link href="/standings">Standings</Link>
              <Link href="/players">Players</Link>
              <Link href="/teams">Teams</Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
