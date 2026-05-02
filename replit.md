# ACP Social Democracy Application

## Overview
This project is a full-stack social democracy platform for the Anti-Corruption Party. It provides tools for democratic participation, including advanced voting systems, polling, group management, candidate profiles, and community engagement. The platform aims to create a transparent and fair system for advanced democratic participation, fostering a new era of political engagement and accountability within a grassroots, subscription-funded political movement.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, Wouter for routing.
- **UI**: Radix UI components with shadcn/ui styling, Tailwind CSS.
- **State Management**: TanStack Query (React Query).
- **Forms**: React Hook Form with Zod validation.
- **Build Tool**: Vite.
- **UI/UX Decisions**: Consistent branding with the ACP logo, mobile-responsive design, accessibility features, and keyboard shortcuts. Dedicated mobile-first interface (`/mobile`) with TikTok-style feed for short videos (Signals).

### Backend Architecture
- **Framework**: Express.js with TypeScript.
- **Authentication**: Passport.js (local strategy, session-based) with Scrypt hashing and role-based access control.
- **API Design**: RESTful endpoints.
- **Database ORM**: Drizzle ORM.
- **Session Management**: Express sessions with PostgreSQL store.

### Database Design
- **Database**: PostgreSQL (Neon serverless).
- **Schema**: Relational design for users, posts, polls, groups, comments, candidates, direct messaging, trading flags, demerits, grading algorithm settings, FEC candidate totals, and ACE pledge requests.

### Key Features & Technical Implementations
- **Authentication & Authorization**: Session-based, role-based access (admin, moderator, citizen, candidate), protected routes, 2FA with trusted devices.
- **Social Feed System**: Supports posts, polls, announcements, with likes, comments, tagging, real-time updates, and a floating video player.
- **Voting & Polling System**: Simple voting, advanced Ranked Choice Voting, and Blockchain Verification via Merkle Tree.
- **Politician & Candidate Management**:
    - **Congress Import System**: Admin one-click import of Congress members, creating politician profiles, positions, SIGs, and sponsorship links. Auto-assigns corruption grades.
    - **Current Representatives Lookup**: DB-backed zip code lookup for congressional representatives.
    - **Candidate Portal**: Profile management, proposal sharing, self-service registration, and "Verified Candidate Profile System" allowing users to claim and manage politician profiles.
    - **@ Handle System**: Unique `@` handles for politician profiles with autocomplete for mentions.
    - **FEC-Powered Configurable Corruption Grading System**: Dynamic grading pipeline using FEC API data, admin-configurable weights, and thresholds.
    - **Duplicate Profile Detection & Merge**: System to identify and merge duplicate politician profiles.
    - **Claim Request System**: Users can request to claim politician profiles, subject to admin approval.
    - **SIG Sponsorship Ranking & Grade Recalculation**: Management of politician-SIG sponsorships affecting corruption grades.
- **Group & Event Management**: Topic and location-based groups with discussion forums and event creation/discovery/registration.
- **Content Systems**: WYSIWYG editor for articles.
- **Real-time Features**: Live trending topics, inline event details.
- **Admin Tools**: IP tracking, user management, State Admin system with data import templates, Missing Info tab for politician profiles, and dedicated review pages for trading flags and ACE pledges.
- **Signal Video Features**: Multi-clip hold-to-record camera with filters and editing capabilities (trim, text annotations, audio, photos/footage, FFmpeg stitching) for short video content, stored via IDB session and uploaded to `uploads/signals/`. Desktop timeline editor at `/signals/edit` with video preview, trim controls, text overlays, background music, and server-side compose via FFmpeg.
- **Trading & Demerit System**: User-submitted insider trading flags, admin-assigned demerits, integration with politician profiles.
- **ACE Badges Module**: Candidates can apply for Anti-Corruption Endorsement (ACE) badges via video pledges, which, upon admin approval, positively impact their corruption grade.

## ACP Agent API Gateway

### Overview
The Agentic AI admin page (`/admin/agentic-ai`) is now the ACP Agent API Gateway control panel. It is restricted to administrators and manages scoped `X-Agent-Key` API keys for external AI agents such as Claw Machine / OpenClaw instead of managing sideloaded Paperclip/Codex app processes.

### How It Works
- Agent keys are stored in `agent_api_keys` with a one-time raw key display, SHA-256 key hash, visible prefix, role, JSON permission map, hourly rate limit, sandbox mode, status, creator, and last-used timestamp.
- Agent activity is stored in `agent_logs` with API key id, agent name, role, endpoint, method, action, payload/response summaries, response status, IP, sandbox flag, success flag, message, metadata, and timestamp.
- `/api/agent/*` routes bypass CSRF and require `X-Agent-Key: acp_agent_...`.
- Agent responses use the standard envelope `{ success, action, data, errors, meta }`.
- Domain writes that require an existing user id use the key creator as the database actor for foreign-key compatibility; `agent_logs` is the authoritative attribution trail for the external agent name, role, key id, endpoint, and payload/response audit record.
- The existing premium/admin developer API under `/api/v1/*` remains separate and unchanged.
- Legacy sideloaded `/api/admin/agent-apps/*` management routes were removed from the active server route set.
- The gateway schema lives in `shared/schema.ts`; database synchronization should be handled through the project’s standard schema workflow once unrelated database drift is resolved.

### Supported Agent Roles
Includes `moderator_agent`, `news_agent`, `qa_agent`, `cybersecurity_agent`, `data_agent`, `analyst_agent`, campaign roles, compliance/legal/auditor roles, journalist/researcher/activist roles, vendor roles, general voter/sandbox roles, and arbitrary custom roles. This expanded role catalog intentionally maps the full political organization role list from the Agent API spec, not only the minimum internal-agent subset. Role defaults are surfaced in the Roles Reference tab; custom roles start with an empty permission map until explicitly configured.

### Agent Permissions
- `articles:create` — create public posts/articles
- `articles:edit` — edit existing posts/articles
- `moderation:flag` — flag posts/comments for review
- `users:ban` — ban user accounts
- `politicians:write` — import or update politician profiles
- `elections:write` — submit election sync reports for admin review
- `testing:run` — submit QA/testing reports
- `security:scan` — submit security scan reports
- `sandbox:use` — call safe test endpoints
- `logs:read` — read activity logs scoped to the current key
- `system:admin` — bypass individual permission checks

### Admin Endpoints
- `GET /api/admin/agent-keys/meta`
- `GET /api/admin/agent-keys`
- `POST /api/admin/agent-keys`
- `PATCH /api/admin/agent-keys/:id`
- `DELETE /api/admin/agent-keys/:id`
- `GET /api/admin/agent-logs`
- `GET /api/admin/is-global-admin`

### Agent Endpoints
- `POST /api/agent/auth/verify`
- `POST /api/agent/articles/create`
- `PUT /api/agent/articles/update`
- `PUT /api/agent/articles/:id`
- `POST /api/agent/moderation/flag`
- `POST /api/agent/users/ban`
- `POST /api/agent/politicians/import`
- `PUT /api/agent/politicians/update`
- `PUT /api/agent/politicians/:id`
- `POST /api/agent/elections/sync`
- `POST /api/agent/testing/run`
- `POST /api/agent/security/scan`
- Mirrored sandbox endpoints under `/api/agent/sandbox/*` validate and authorize the same operations without writing production data
- `GET /api/agent/logs`

### Google SSO
- **Strategy**: `passport-google-oauth20` added as a Passport.js strategy
- **Schema**: `google_id TEXT UNIQUE` column added to `users` table
- **Flows**: Login, register, and account linking (existing email → links Google ID)
- **Routes**: `GET /auth/google` (initiates) → `GET /auth/google/callback` (completes)
- **Callback URL**: Dynamic per-request — works in both dev (`http://localhost:5000`) and production (`https://`)
- **New accounts**: Username derived from Google email prefix (unique collision handling); random unusable password set
- **Secrets required**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (Replit Secrets)
- **Google Cloud Console**: Authorized redirect URIs must include your dev URL + `/auth/google/callback` and production domain + `/auth/google/callback`

## External Dependencies

### Database Infrastructure
- **Neon Database**: Serverless PostgreSQL.

### UI Framework Dependencies
- **Radix UI**: Accessible component primitives.
- **Lucide Icons**: Icon system.
- **Tailwind CSS**: Utility-first CSS framework.

### Development Tools
- **ESBuild**: Bundling.
- **Vite**: Development server.
- **TSX**: TypeScript execution.
- **Vitest + Supertest**: Automated test suite for the Agent API Gateway (`server/__tests__/agentAuth.test.ts`). Run with `./node_modules/.bin/vitest run --config vitest.config.ts`.

## Automated Test Suite

### Agent API Gateway Tests (`server/__tests__/agentAuth.test.ts`)
29 tests covering:
- **Key generation**: Format and uniqueness of `acp_agent_` prefixed keys.
- **Authentication**: Missing header, empty header, invalid key, valid key flow, SHA-256 hash lookup.
- **Audit logging**: Logs written on auth failure, permission denial, and rate limit events; redaction of sensitive fields; endpoint/method/action/status recorded.
- **lastUsedAt tracking**: `touchAgentApiKey` called on successful auth.
- **Revocation**: Revoked keys (storage returns undefined) rejected with 401.
- **Permission enforcement**: Allowed endpoints pass (201/200), disallowed return 403 with action name in error, `system:admin` bypasses all checks.
- **Rate limiting**: 429 with `Retry-After` header after limit is consumed.
- **Sandbox mode**: `agentSandbox=true` for keys with `sandboxMode=true` or `role=qa_agent`.
- **API isolation**: `/api/v1` developer API (Bearer token) is entirely separate; agent keys do not grant access; `findAgentApiKeyByHash` not called on `/api/v1` routes.

Storage is mocked with `vi.mock`, so tests run without a real database or external agent.

### Payment Integration
- **Stripe**: Subscription management and crowdfunding.
- **React Stripe.js**: Client-side payment components.

### APIs
- **Google Divisions API**: For fetching representative data.
- **ip-api.com**: For IP geolocation.
- **Quiver Quantitative API**: Congressional stock trading data.
- **FEC API**: Federal Election Commission data for corruption grading.
- **US Census Bureau Geocoding API**: For zip code to congressional district lookup.