import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #f5f6f8 0%, #e4eafc 100%)',
        }}
      >
        <div style={{ display: 'flex', fontSize: 96, fontWeight: 800, color: '#14161a' }}>stats.omit.gg</div>
        <div style={{ display: 'flex', fontSize: 34, color: '#6b7280', marginTop: 20 }}>
          Call of Duty Challengers stats hub
        </div>
      </div>
    ),
    { ...size }
  );
}
