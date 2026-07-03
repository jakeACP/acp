---
name: CSRF on non-apiRequest POSTs
description: Any raw fetch() POST/PUT/DELETE must include the x-csrf-token header
---

All state-changing requests (POST/PUT/PATCH/DELETE) are protected by
`doubleCsrfProtection` (csrf-csrf) registered in `server/auth.ts`. Exempt paths:
`/api/webhooks/*`, `/api/v1/*`, `/api/agent/*`. Everything else — including
`/api/upload` — rejects requests missing the `x-csrf-token` header with 403.

**Rule:** When you cannot use `apiRequest` (e.g. FormData/file uploads that need
raw fetch), you MUST add the CSRF header yourself. Use `getCsrfToken()` /
`fetchCsrfToken()` exported from `client/src/lib/queryClient.ts`, and retry once
after `fetchCsrfToken()` if the first attempt returns 403.

**Why:** A plain `fetch("/api/upload", {method:"POST"})` silently fails with 403
and looks like "nothing happens" — the file upload button appears broken when the
real issue is the missing token. `apiRequest` handles this automatically; raw
fetch does not.
