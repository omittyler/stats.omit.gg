import Link from 'next/link';
import { computeStandings, getTeamLogos } from '@/lib/standings';
import PlayersTable from '@/components/PlayersTable';

// See app/standings/page.tsx - same reason: avoid Next.js caching this fetch
// and showing stale numbers after the underlying data changes.
export const dynamic = 'force-dynamic';

export default async function PlayersPage() {
  const [{ playerStandings }, logos] = await Promise.all([computeStandings(), getTeamLogos()]);

  const rows = playerStandings.map((p, i) => ({ ...p, rank: i + 1 }));

  return (
    <main className="container">
      <div className="page-hero">
        <h1>Black Ops 7 (BO7) Player Points</h1>
        <p className="note">
          Sum of CDC points earned across every Black Ops 7 (BO7) event, attributed to the player (full
          placement points each roster player, not split). &ldquo;Current Team&rdquo; is that
          player&apos;s most recent event by date. See <Link href="/standings">team standings</Link>,
          which are built from these totals.
        </p>
      </div>
      <div className="card">
        <PlayersTable rows={rows} logos={logos} />
      </div>
    </main>
  );
}
