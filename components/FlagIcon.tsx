import { flagCodeForOrigin } from '@/lib/countryFlags';

/** Renders nothing if `origin` has no known flag-icons code - see lib/countryFlags.ts. */
export function FlagIcon({ origin }: { origin: string | null | undefined }) {
  const code = flagCodeForOrigin(origin);
  if (!code) return null;
  return <span className={`fi fi-${code}`} style={{ marginRight: 6 }} title={origin ?? undefined} />;
}
