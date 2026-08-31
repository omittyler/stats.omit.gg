import { readFileSync } from 'node:fs';
import path from 'node:path';

function mimeFor(filename: string): string {
  if (filename.endsWith('.png')) return 'image/png';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
  return 'image/webp';
}

// Satori (the renderer behind next/og's ImageResponse) cannot decode WebP -
// embedding one doesn't error gracefully, it kills the whole response
// (confirmed empirically: every player with a real .webp photo crashed their
// opengraph-image route with net::ERR_EMPTY_RESPONSE, while .png ones and the
// no-photo DefaultPlayer.png fallback worked fine). Most player photos in
// data/incoming/player_details.csv are .webp, so this can't just be "use
// .png instead" - callers should treat an unsupported format as "no photo"
// and fall back to a text-only layout, same as a genuinely missing file.
export function isSatoriImageFormat(filename: string): boolean {
  return filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg');
}

/**
 * Reads an image out of /public and inlines it as a data: URI, for use
 * inside an opengraph-image.tsx's ImageResponse - Satori can't resolve a
 * plain "/players/foo.png"-style relative path the way a browser would.
 * Returns null if the file is missing OR its format isn't one Satori can
 * render (see isSatoriImageFormat) - callers should treat both the same way.
 */
export function publicImageDataUri(relPath: string): string | null {
  if (!isSatoriImageFormat(relPath)) return null;
  try {
    const filePath = path.join(process.cwd(), 'public', relPath);
    const buf = readFileSync(filePath);
    return `data:${mimeFor(relPath)};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}
