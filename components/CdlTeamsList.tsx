'use client';

import { useState } from 'react';
import Link from 'next/link';

export type CdlRosterPlayer = {
  name: string;
  fullName: string | null;
  origin: string | null;
  photoFilename: string | null;
};

export type CdlTeamEntry = {
  name: string;
  logoFilename?: string;
  roster: CdlRosterPlayer[];
};

export default function CdlTeamsList({ teams }: { teams: CdlTeamEntry[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="cdl-team-list">
      {teams.map((team) => {
        const isOpen = expanded === team.name;
        return (
          <div key={team.name} className="cdl-team-item">
            <button
              className="cdl-team-header"
              onClick={() => setExpanded(isOpen ? null : team.name)}
              aria-expanded={isOpen}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/teams/${team.logoFilename ?? 'Default.png'}`} alt="" width={40} height={40} />
              <span className="cdl-team-name">{team.name}</span>
              <span className="cdl-team-chevron">{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
              <div className="cdl-team-roster">
                {team.roster.length ? (
                  <div className="roster-grid">
                    {team.roster.map((p) => (
                      <div key={p.name} className="roster-card">
                        <Link href={`/players/${encodeURIComponent(p.name)}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/players/${p.photoFilename || 'DefaultPlayer.png'}`}
                            alt={p.name}
                            width={72}
                            height={72}
                            className="roster-card-photo"
                          />
                          <div className="roster-card-gamertag">{p.name}</div>
                        </Link>
                        {p.fullName && <div className="roster-card-name">{p.fullName}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="note">No Challengers players currently tracked on this roster.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
