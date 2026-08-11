---
name: Vite manualChunks white page
description: Why vendor chunk splitting broke the production build and the SSR bot-gating rule
---

**Rule 1:** Never split node_modules into multiple vendor chunks in vite.config manualChunks. Keep one `vendor` chunk.
**Why:** Splitting React (`vendor-react`) from libs that touch React at module-init time (in `vendor-misc`) caused `TypeError: Cannot set properties of undefined (setting 'Children')` at startup in production only → white blank page. Dev was unaffected because Vite serves unbundled modules.
**How to apply:** If bundle-size pressure returns, split only app-level code (route-based chunks like chunk-admin/chunk-mobile), not vendor code.

**Rule 2:** All server SSR/prerender routes (the SEO routes in server/routes.ts that inject content into `<div id="root">`) must start with `if (!isBot(req)) return next();`.
**Why:** Without it, real browsers get the pre-rendered HTML instead of the SPA — dev showed a plain text page; combined with the chunk bug, production showed a blank page. Bots still need the SSR content for OG tags/SEO.
**How to apply:** Any new shareable/SEO route handler must include the isBot gate; `curl` counts as a bot in the regex, so test browser behavior with a Mozilla User-Agent.

**Debug technique:** To capture production-only browser errors, temporarily point the "Start application" workflow at `npm run start` (prod build on port 5000), screenshot to collect console logs, then restore `npm run dev`.
