# CLAUDE.md

This file gives Claude Code instructions for working in this repository.

**Before doing any work in this project, read [PROJECT.md](PROJECT.md).** It is the living source of truth for this project — architecture decisions, page specs, draft database schema, open questions/blockers, and a dated changelog. It is written to be self-sufficient: a session with no prior context (including on a different Claude Code account) should be able to resume work from it alone.

**Keep PROJECT.md up to date as you work:**
- When a decision is made (architecture, scope, schema), record it in the relevant section and remove/update it from "Open Questions" if it resolves one.
- When scope is added or cut, update the page specs / next steps sections.
- When you complete a meaningful chunk of work, append a dated entry to the Changelog section (§7) — short, factual, no narration.
- Do not let PROJECT.md drift out of sync with the actual state of the code or decisions made in conversation.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
