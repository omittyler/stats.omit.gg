import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ padding: 32, maxWidth: 720, margin: '0 auto' }}>
      <h1>stats.omit.gg</h1>
      <p>Call of Duty Challengers stats hub — early scaffold.</p>
      <p>
        <Link href="/standings">View 2026 Season Standings &rarr;</Link>
      </p>
    </main>
  );
}
