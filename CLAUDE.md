# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ACP Social Democracy — a full-stack platform for the Anti-Corruption Party. It combines a social feed, advanced voting/polling, politician corruption grading, SIG (Special Interest Group) tracking, and democratic participation tools.

## Commands

```bash
# Development (runs Express + Vite dev server via tsx)
npm run dev

# Type checking
npm run check

# Production build (Vite for client, esbuild for server)
npm run build

# Production server
npm run start

# Push schema changes to the database (no migrations generated)
npm run db:push
```

There is no test runner configured. Type-check with `npm run check`.

## Architecture

### Monorepo Layout

- `client/` — React SPA (Vite)
- `server/` — Express API + WebSocket server (tsx in dev, esbuild in prod)
- `shared/` — Types shared between client and server: `schema.ts` (Drizzle ORM tables + Zod insert schemas) and `feed-config.ts`

### Server

- **Entry**: `server/index.ts` — starts listening immediately, then dynamically imports `routes.ts` to avoid cold-start 502s. A 503 startup guard blocks all requests until routes finish loading.
- **Routes**: All API routes are registered in `server/routes.ts` via `registerRoutes()`. Auth setup (`passport.js` local strategy, session) happens inside that function via `setupAuth()` from `server/auth.ts`.
- **Storage layer**: `server/storage.ts` exports a singleton `storage` object implementing the `IStorage` interface — all DB access goes through this. Uses Drizzle ORM with a Neon PostgreSQL pool (`server/db.ts`).
- **Sessions**: PostgreSQL-backed via `connect-pg-simple`. Session cookies use `SameSite=Strict`. CSRF protection via `csrf-csrf` (double-submit cookie).
- **WebSockets**: A `ws` WebSocket server is attached to the HTTP server in `routes.ts` for real-time features.
- **Admin password sync**: On every startup, if `ADMIN_PASSPHRASE` env var is set, the admin user's password is updated to match.

### Client

- **Routing**: `wouter`. All routes defined in `client/src/App.tsx`. Most routes use `<ProtectedRoute>` which redirects to `/auth` if unauthenticated.
- **Auth state**: `useAuth()` hook (context in `client/src/hooks/use-auth.tsx`) wraps `/api/user` query; user object is `null` when logged out.
- **API calls**: TanStack Query (`@tanstack/react-query`). The query client in `client/src/lib/queryClient.ts` throws on non-OK responses. API calls use `credentials: "include"`.
- **Forms**: React Hook Form + Zod (schemas from `shared/schema.ts` via `drizzle-zod`).
- **UI**: shadcn/ui components (`client/src/components/ui/`) built on Radix UI primitives, styled with Tailwind CSS v3. Component aliases configured in `components.json` with `@/` path prefix.
- **Mobile**: Separate mobile layout at `/mobile/*` routes rendered by `client/src/mobile/MobileApp`.

### Database Schema

All tables defined in `shared/schema.ts` using Drizzle ORM. Key tables:
- `users` — roles: `admin`, `state_admin`, `moderator`, `citizen`, `candidate`
- `politicianProfiles` / `politicianSigSponsorships` / `specialInterestGroups` — corruption grading system
- `gradingAlgorithmSettings` — single-row config for FEC-based grading weights/thresholds
- `fecCandidateTotals` — FEC API cache (48hr expiry)
- `posts`, `polls`, `pollVotes`, `comments`, `likes`, `reactions` — social feed
- `acpBlocks`, `acpTransactions` — blockchain-verified voting (Merkle tree in `server/lib/blockchain.ts`)

### Key Environment Variables

- `DATABASE_URL` — Neon PostgreSQL connection string (required)
- `ADMIN_PASSPHRASE` — synced to admin user password on startup
- `FEC_API_KEY` — for FEC API corruption grading
- `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLIC_KEY` — payment integration
- `SENDGRID_API_KEY` — email
- `TWILIO_*` — SMS / 2FA

### Notable Patterns

- **Schema changes**: Edit `shared/schema.ts`, then run `npm run db:push` (no migration files — Drizzle pushes directly).
- **New API routes**: Add to `server/routes.ts` inside `registerRoutes()`. Guard with `req.isAuthenticated()` or role checks (`req.user.role === 'admin'`).
- **New pages**: Create in `client/src/pages/`, import and add a `<Route>` or `<ProtectedRoute>` in `App.tsx`.
- **Ranked Choice Voting**: Logic in `server/lib/ranked-choice.ts`.
- **Blockchain verification**: Merkle-tree implementation in `server/lib/blockchain.ts` and `server/blockchain.ts`.
- **State Admin role**: Has `managedState` field; guarded by `ensureStateAdmin` middleware; accesses `/admin/state-data` portal.
