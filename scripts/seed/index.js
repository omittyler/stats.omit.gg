import { seedTeams } from './seed-teams.js';
import { seedPointsScale } from './seed-points-scale.js';
import { seedEventsAndPlacements } from './seed-events-and-placements.js';
import { seedPlayerEventStats } from './seed-player-event-stats.js';

async function main() {
  await seedTeams();
  await seedPointsScale();
  await seedEventsAndPlacements();
  await seedPlayerEventStats();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
