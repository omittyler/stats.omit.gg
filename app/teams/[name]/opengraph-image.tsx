import { ImageResponse } from 'next/og';
import { computeStandings } from '@/lib/standings';
import { supabase } from '@/lib/supabase';
import { publicImageDataUri } from '@/lib/ogImage';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ name: string }> }) {
  const { name: rawName } = await params;
  const teamName = decodeURIComponent(rawName);

  const { teamStandings } = await computeStandings();
  const standing = teamStandings.find((t) => t.name === teamName);

  const { data: teamRow } = await supabase.from('teams').select('logo_filename').eq('name', teamName).maybeSingle();
  const logoDataUri =
    publicImageDataUri(`teams/${teamRow?.logo_filename ?? 'Default.png'}`) ?? publicImageDataUri('teams/Default.png');

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
          {logoDataUri && (
            <div
              style={{
                display: 'flex',
                width: 260,
                height: 260,
                borderRadius: 36,
                background: '#ffffff',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 32,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoDataUri} width={196} height={196} style={{ objectFit: 'contain' }} />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 76, fontWeight: 800, color: '#14161a' }}>{teamName}</div>
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
