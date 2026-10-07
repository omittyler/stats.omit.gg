import { PHASE_PRODUCTION_BUILD } from 'next/constants.js';

/**
 * Static export: `next build` writes the whole site as plain files to `out/`,
 * which GitHub Pages serves (.github/workflows/pages.yml). Every page is
 * prebuilt from Supabase at build time - there is no server at request time.
 * `trailingSlash` makes each page `<path>/index.html`, so names containing a
 * dot (e.g. "Pain Nation e.v.") aren't mistaken for file extensions.
 *
 * `output: 'export'` is only set for `next build`: under `next dev` it makes
 * any page whose name has a space (most teams/events) error, because dev
 * compares the still-URL-encoded name against the prebuilt list.
 *
 * @param {string} phase
 * @returns {import('next').NextConfig}
 */
export default function nextConfig(phase) {
  return {
    output: phase === PHASE_PRODUCTION_BUILD ? 'export' : undefined,
    trailingSlash: true,
  };
}
