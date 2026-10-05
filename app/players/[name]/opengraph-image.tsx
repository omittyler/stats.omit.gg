import { ImageResponse } from 'next/og';
import { getEnrichedPlacements, computeStandings, getPlayerDetails, getTeamLogos } from '@/lib/standings';
import { publicImageDataUri } from '@/lib/ogImage';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ name: string }> }) {
  const { name: rawName } = await params;
  const playerName = decodeURIComponent(rawName);

  const placements = await getEnrichedPlacements();
  const { playerStandings } = await computeStandings();
  const standing = playerStandings.find((p) => p.name === playerName);
  const details = await getPlayerDetails(playerName);
  const logos = await getTeamLogos();

  const photoDataUri =
    publicImageDataUri(`players/${details?.photoFilename || 'DefaultPlayer.png'}`) ??
    publicImageDataUri('players/DefaultPlayer.png');
  const teamLogoDataUri = standing ? publicImageDataUri(`teams/${logos[standing.currentTeam] ?? 'Default.png'}`) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '0 80px',
          background: 'linear-gradient(135deg, #f5f6f8 0%, #e4eafc 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 48 }}>
          {photoDataUri && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoDataUri}
              width={260}
              height={260}
              style={{ borderRadius: '50%', objectFit: 'cover', border: '10px solid #ffffff' }}
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 76, fontWeight: 800, color: '#14161a' }}>{playerName}</div>
            {(details?.fullName || details?.origin) && (
              <div style={{ display: 'flex', fontSize: 32, color: '#6b7280', marginTop: 10 }}>
                {[details?.fullName, details?.origin].filter(Boolean).join(' — ')}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 28 }}>
              {teamLogoDataUri && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={teamLogoDataUri} width={52} height={52} style={{ objectFit: 'contain' }} />
              )}
              <div style={{ display: 'flex', fontSize: 30, color: '#14161a', fontWeight: 600 }}>
                {standing?.currentTeam ?? 'Free Agent'}
              </div>
            </div>
            <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, color: '#2563eb', marginTop: 22 }}>
              {(standing?.points ?? 0).toLocaleString()} CDC points
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', position: 'absolute', bottom: 40, right: 64, fontSize: 26, color: '#6b7280', fontWeight: 700 }}>
          stats.omit.gg
        </div>
      </div>
    ),
    { ...size }
  );
}
