import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="container">
      <h1>stats.omit.gg</h1>
      <p className="note">Call of Duty Challengers stats hub — early build.</p>
      <p>
        <Link href="/standings">View 2026 Season Team Standings &rarr;</Link>
      </p>
      <p>
        <Link href="/players">View 2026 Season Player Points &rarr;</Link>
      </p>
      <p>
        <Link href="/teams">Browse Teams &rarr;</Link>
      </p>
    </main>
  );
}
