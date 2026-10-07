// Runs after `next build` (see package.json "build"). The static export
// writes each share image as an extensionless `opengraph-image` file, and
// GitHub Pages picks a file's content type from its extension - without
// `.png`, social sites get a generic download instead of an image. Renames
// every one to `opengraph-image.png` and points the pages' meta tags at the
// new name.
import { readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const OUT = 'out';
let renamed = 0;
let rewritten = 0;

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full !== path.join(OUT, '_next')) walk(full);
    } else if (entry.name === 'opengraph-image') {
      renameSync(full, `${full}.png`);
      renamed++;
    } else if (entry.name.endsWith('.html') || entry.name.endsWith('.txt')) {
      const text = readFileSync(full, 'utf8');
      const fixed = text.replaceAll('/opengraph-image?', '/opengraph-image.png?');
      if (fixed !== text) {
        writeFileSync(full, fixed);
        rewritten++;
      }
    }
  }
}

walk(OUT);
console.log(`fix-og-images: renamed ${renamed} images, updated ${rewritten} pages`);
