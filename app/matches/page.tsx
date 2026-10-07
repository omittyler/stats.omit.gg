import { getAllMatches } from '@/lib/matches';
import { getTeamLogos } from '@/lib/standings';
import MatchesList from '@/components/MatchesList';

export const metadata = {
  title: 'Matches — stats.omit.gg',
  description: 'Every Call of Duty Challengers match, most recent first.',
};

export default async function MatchesPage() {
  const [matches, logos] = await Promise.all([getAllMatches(), getTeamLogos()]);

  return (
    <main className="container container-wide">
      <div className="page-hero">
        <h1>Matches</h1>
        <p className="note">Every tracked match, most recent first.</p>
      </div>
      <div className="card">
        <MatchesList matches={matches} logos={logos} />
      </div>
    </main>
  );
}
