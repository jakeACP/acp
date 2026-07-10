---
name: apiRequest argument order
description: Correct call order for the shared apiRequest helper in client/src/lib/queryClient.ts
---
The shared helper is `apiRequest(url, method, data?)` — URL first, then HTTP method, then optional body.

**Why:** It's easy to assume `(method, url)` (like fetch-wrappers in other codebases). Swapping them makes the request target a URL literally named `"POST"`/`"PATCH"`, silently failing at runtime with no type error (both params are `string`).

**How to apply:** Any mutation using apiRequest — e.g. `apiRequest("/api/user/discoverability", "PATCH", body)`, `apiRequest("/api/candidates/:id/support", "POST")`. TanStack Query mutations across this repo rely on this order.
