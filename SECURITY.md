# ACP Security Notes — Production Hardening Pass

Date: 2026-07-10

## Changes Made in This Pass

### 1. HTTP Security Headers (`server/index.ts`)
| Header | Before | After |
|---|---|---|
| `X-Powered-By` | `Express` (leaked) | Removed via `app.disable('x-powered-by')` |
| `Strict-Transport-Security` | `max-age=31536000` (1 yr) | `max-age=63072000; includeSubDomains` (2 yr) |
| `Referrer-Policy` | `same-origin` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Not set | Camera/mic/geo scoped to `self`; usb/bt/sensors blocked |
| `CSP: script-src` | Included `'unsafe-eval'` always | `'unsafe-eval'` now **dev-only** (Vite HMR); removed in prod |
| `CSP: connect-src` | `'self' wss: https: http:` | `'self' wss: https:` — bare `http:` removed |
| `CSP: img-src` | included `http:` | Removed bare `http:` |
| `CSP: script-src` | No Stripe | Added `https://js.stripe.com` |
| `CSP: object-src` | Not set | `'none'` (blocks Flash / legacy plugins) |
| `CSP: base-uri` | Not set | `'self'` (prevents `<base>` tag hijacking) |

### 2. npm Dependency Vulnerabilities
`npm audit fix` was run. All production-dependency vulnerabilities are resolved.

Remaining 2 (Windows-only dev tooling — not production-relevant):
- `vite` in `vitest` — `server.fs.deny` bypass on Windows paths (dev-only; Linux prod unaffected)
- `esbuild` in `tsx` — file-read disclosure on Windows (dev-only)

### 3. Upload Endpoint Hardening (`server/routes.ts`)

**Signal video `fileFilter` — OR → AND logic**
Previously the filter passed a file if its MIME type matched **or** its extension matched. An attacker could send a malicious payload with `Content-Type: video/mp4` and a disguised filename. Now both the MIME type **and** the extension must match an allowlist.

**Per-user upload rate limit** (already in place from prior pass): 10 signal uploads / user / hour.

**FFmpeg re-encoding as secondary defence**: even if a malformed file passes the MIME/ext filter, FFmpeg transcodes it to H.264/AAC MP4. Files that aren't valid video will fail FFmpeg and be rejected at the transcoding step.

### 4. API Abuse Protection (`server/routes.ts`)

New per-user rate limiters (backed by `rate-limiter-flexible` in-memory store, already a prod dep):

| Route | Limit |
|---|---|
| `POST /api/likes` | 30 / min |
| `POST /api/mobile/signals/:id/like` | 30 / min (shared limiter) |
| `DELETE /api/mobile/signals/:id/like` | 30 / min (shared limiter) |
| `POST /api/comments` | 10 / min |
| `POST /api/mobile/signals/:id/comments` | 10 / min (shared limiter) |
| `POST /api/flags` | 5 / hr |
| `POST /api/login` | Existing brute-force limiter in `server/auth.ts` |
| `POST /api/register` | Existing registration limiter in `server/auth.ts` |

## Remaining Known Risks

### A. Virus / Malware Scanning — NOT AVAILABLE
No ClamAV or equivalent is installed in this environment. Uploaded signal videos are:
- Filtered by MIME type + extension (client claim only — spoofable)
- Re-encoded by FFmpeg (destroys most payloads embedded in video containers)
- Served back only to authenticated users from `uploads/signals/`

**Mitigation**: FFmpeg re-encoding is the strongest available defence. For a higher security bar, integrate a cloud scanning service (e.g. AWS Malware Protection, VirusTotal API) before writing the file to permanent storage.

### B. MIME Magic-Byte Sniffing — NOT IMPLEMENTED
The upload filter trusts the HTTP-declared MIME type + file extension. True magic-byte detection (reading the first bytes of the file buffer) would add another layer. The FFmpeg transcoding step currently acts as a compensating control.

**Mitigation path**: Install `file-type` npm package and read the first 4 KB of the buffer before accepting the file. Requires switching signal uploads from disk storage to memory storage (or a two-phase approach: save to disk → sniff → reject/keep).

### C. `'unsafe-inline'` in `script-src` — CANNOT REMOVE YET
React with Vite/shadcn injects inline styles and event handlers. Removing `'unsafe-inline'` would require implementing nonce-based CSP across all components — a significant refactor.

**Risk level**: Medium. Mitigated by the fact that all user-supplied content is stored separately and not injected into `<script>` tags.

### D. Capacitor / Native App Session Cookies
The session and CSRF cookies use `sameSite: "lax"`. Capacitor iOS/Android apps make HTTP requests from a `capacitor://` or `ionic://` scheme origin, which browsers classify as cross-site.

- **If the mobile app is shipped as a Capacitor native binary**, sessions will NOT attach and login will silently fail.
- **Current state**: The `/mobile` route is a web PWA served from the same origin — so this is not an active problem.

**If Capacitor packaging is pursued**: Change cookies to `sameSite: "none"; secure: true` (requires HTTPS), update the CSRF cookie config in `server/auth.ts` accordingly, and add the Capacitor origin to any CORS/allowlist.

### E. In-Memory Rate Limiters — Not Distributed
The `rate-limiter-flexible` instances in `server/routes.ts` and `server/auth.ts` are `RateLimiterMemory`. On a multi-process or multi-instance deployment, each instance has its own counter — a user could exploit this by hitting different instances.

**Mitigation path**: Switch to `RateLimiterPostgres` or `RateLimiterRedis` from the same package to share state across instances. The Neon PostgreSQL connection is already available.

### F. Session Secret Rotation
`SESSION_SECRET` and `CSRF_SECRET` are read from environment variables but there is no automated rotation mechanism. If these are ever leaked, all active sessions are compromised.

**Mitigation**: Store secrets in Replit Secrets (already done); rotate manually if a breach is suspected.
