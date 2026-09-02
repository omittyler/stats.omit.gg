import { computeStandings, getTeamLogos, getAllPlayerDetails } from '@/lib/standings';
import { OFFICIAL_CDL_TEAMS } from '@/lib/officialCdlTeams';
import CdlTeamsList, { type CdlTeamEntry } from '@/components/CdlTeamsList';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'CDL Teams — stats.omit.gg',
  description: 'The 12 official Call of Duty League franchises and their current Challengers-tracked roster.',
};

export default async function CdlTeamsPage() {
  const [{ playerStandings }, logos, playerDetails] = await Promise.all([
    computeStandings(),
    getTeamLogos(),
    getAllPlayerDetails(),
  ]);

  // "Current roster" here reuses the exact same currentTeam/rosterStale logic
  // as a team page (lib/standings.ts, PROJECT.md §8ac) - a Challengers player
  // shows up under a CDL team once that's genuinely their most recent event
  // (e.g. picked up for the Esports World Cup), same mechanism that already
  // powers the gold "CDL Player" banner on their own page.
  const teams: CdlTeamEntry[] = [...OFFICIAL_CDL_TEAMS]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const roster = playerStandings
        .filter((ps) => ps.currentTeam === name && !ps.rosterStale)
        .map((ps) => {
          const details = playerDetails.get(ps.name.toLowerCase());
          return {
            name: ps.name,
            fullName: details?.fullName ?? null,
            origin: details?.origin ?? null,
            photoFilename: details?.photoFilename ?? null,
          };
        });
      return { name, logoFilename: logos[name], roster };
    });

  return (
    <main className="container">
      <div className="page-hero">
        <h1>CDL Teams</h1>
      </div>
      <CdlTeamsList teams={teams} />
    </main>
  );
}
