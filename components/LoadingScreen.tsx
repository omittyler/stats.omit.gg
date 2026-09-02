'use client';

import { useEffect, useState } from 'react';

// Shown once per real page load (this component lives in the root layout,
// which only mounts on a hard navigation/refresh - client-side <Link> route
// changes elsewhere in the app don't remount it, so this never re-fires on
// every internal click, only when someone actually "goes to the webpage").
export default function LoadingScreen() {
  const [fading, setFading] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 3000);
    const removeTimer = setTimeout(() => setVisible(false), 3400);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`loading-screen ${fading ? 'loading-screen-fading' : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="loading-screen-logo" src="/teams/OMiT.png" alt="OMiT" />
      <div className="loading-bar-track">
        <div className="loading-bar-fill" />
      </div>
    </div>
  );
}
