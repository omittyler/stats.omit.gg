import Link from 'next/link';

export function TeamBadge({ name, logoFilename }: { name: string; logoFilename?: string }) {
  return (
    <Link href={`/teams/${encodeURIComponent(name)}`} className="team-badge">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/teams/${logoFilename ?? 'Default.png'}`} alt="" width={24} height={24} />
      <span>{name}</span>
    </Link>
  );
}
