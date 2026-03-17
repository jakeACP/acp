# ACP Social Democracy Application

## Overview
This project is a full-stack social democracy platform for the Anti-Corruption Party, a grassroots, subscription-funded political movement. It provides tools for democratic participation, including advanced voting systems (Ranked Choice, Blockchain-verified), polling, group management, candidate profiles, and community engagement. The platform aims to create a transparent and fair system for advanced democratic participation, fostering a new era of political engagement and accountability.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter
- **UI Library**: Radix UI components with shadcn/ui styling
- **Styling**: Tailwind CSS with CSS variables
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite
- **UI/UX Decisions**: Consistent branding with the ACP logo, mobile-responsive design, accessibility features, and keyboard shortcuts.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Authentication**: Passport.js (local strategy, session-based) with Scrypt hashing and role-based access control.
- **API Design**: RESTful endpoints
- **Database ORM**: Drizzle ORM
- **Session Management**: Express sessions with PostgreSQL store

### Database Design
- **Database**: PostgreSQL (Neon serverless)
- **Schema**: Relational design for users, posts, polls, groups, comments, candidates, and direct messaging.

### Key Features & Technical Implementations
- **Authentication System**: Session-based, role-based access (admin, moderator, citizen, candidate), protected routes.
- **Social Feed System**: Supports posts, polls, announcements, with likes, comments, tagging, real-time updates, and a floating video player (manual pop-out via button, return-to-feed and close controls in a header bar above the iframe).
- **Voting & Polling System**: Includes simple voting, advanced Ranked Choice Voting, and Blockchain Verification via Merkle Tree for cryptographic security.
- **Congress Import System**: Admin one-click import of all 535 Congress members from a TrackAIPAC XLSX file. Creates politician profiles, congressional positions, 53 Israel lobby group SIGs, and SIG sponsorship links. Corruption grades auto-assigned based on total lobby money received. "Rejects AIPAC" badge for 16 pledged politicians.
- **Current Representatives Lookup**: DB-backed zip code → congressional district lookup using the free US Census Bureau Geocoding API (no key required). Returns the user's 2 senators + house rep from our politician profiles DB with corruption grades, party, and lobby money data. Navigation tab renamed "Current Reps".
- **Group Management**: Topic and location-based groups with discussion forums.
- **Event Management System**: Comprehensive event creation, location-based discovery, and registration.
- **Candidate Portal**: Profile management, proposal sharing, community integration, and self-service registration, including detailed politician profiles with corruption grading and claimable pages. **Verified Candidate Profile System**: Users who claim and get approved for a politician profile get `claimedPoliticianId` in their user data. Navigation dropdown shows "Edit Candidate Profile" (`/political-profile`) and "View Candidate Profile" links. Edit page has a fixed ACP-managed header (photo, handle, contact, grade, endorsements) with "Request Changes" for corrections, plus 2 tabs: "Candidate Profile" (modular editor using `candidate_profile_modules` table) and "News Feed" (posts mentioning the politician). Public politician profile pages show a "Candidate Profile" tab when the politician is claimed. API: `GET/PUT /api/candidate-profile/:politicianId/modules`, `POST /api/politicians/:id/correction`.
- **Data Flow**: Client-server communication via RESTful JSON APIs, centralized error handling, and caching.
- **Data Validation**: Client-side (Zod, React Hook Form) and server-side (Drizzle schema) validation with end-to-end TypeScript.
- **Security & Account Management**: Secure password updates, enhanced registration, CSRF protection (double-submit cookie via csrf-csrf), session cookies with SameSite=Strict, and 2FA (TOTP/SMS with challenge tokens).
- **Scalability**: Designed for scalability with serverless PostgreSQL and optimized static assets.
- **Content Systems**: WYSIWYG editor for articles and long-form content, integrated into the feed.
- **Real-time Features**: Live trending topics based on hashtags and inline display of event details in posts.
- **Admin Tools**: IP tracking for user registration/login and comprehensive user management.
- **Interest Groups (SIG Directory)**: Public `/sigs` directory and `/sigs/:tag` profile pages for 62 special interest groups (Super PACs, Dark Money, Industry PACs, Pledges, Labor Unions, Endorsement Orgs). Schema extended with `tag`, `sentiment`, `dataSourceName`, `dataSourceUrl`, `gradeWeight` (real, default 1.0), `isAce` (boolean) columns. Admin "Seed 62 SIGs" button upserts all 62 from XLSX data. SIG badges on politician profiles are clickable links. Navigation tab renamed to "Interest Groups". Public APIs: `GET /api/sigs`, `GET /api/sigs/:tag`. **Anti-Corruption Endorsements (ACEs)**: New SIG category "Anti-Corruption Endorsement" auto-sets `isAce=true` and acts as a grade reducer (each ACE × gradeWeight offsets negative SIG money). ACE cards shown with emerald background + Shield icon in public directory. Admin SIGs table shows ACE badge and grade weight multiplier.
- **SIG Sponsorship Ranking & Grade Recalculation**: `politicianSigSponsorships` table has `sigRank` (integer, nullable). Admin politician profiles have a new "Manage SIGs" dialog (Shield icon button) showing all linked SIGs with up/down rank arrows and an "Unlink" button. A "Recalculate Grade" button calls `POST /api/admin/politician-profiles/:id/recalculate-grade` which computes a weighted score (reportedAmount × gradeWeight × 1/rank for negative SIGs, minus gradeWeight × 1/rank × $500k for ACEs) and maps to A/B/C/D/F thresholds, then persists the grade.
- **State Admin System**: New `state_admin` role (between admin and moderator) with `managedState` field (2-letter state code e.g. "MN"). Admins assign via User Management → "Manage Role" dialog. State admins access the **State Data Portal** (`/admin/state-data`) with downloadable CSV templates for Candidates, Representatives, and SIGs. `ensureStateAdmin` middleware guards data-import routes. Download template buttons added to SIGs, Politicians, and Representatives admin pages. Template utility in `client/src/lib/download-template.ts`.
- **BallotPedia Total Contributions**: `politicianProfiles` has a `total_contributions` (integer, cents) column scraped from BallotPedia during admin "Refresh Data". Scraper parses the "campaign contribution history" HTML table: uses the explicit "Grand total" row when present, otherwise sums all per-cycle contribution amounts (supports both Ted Cruz-style concise pages and Nancy Pelosi/Bernie Sanders-style multi-cycle pages). Displayed prominently in red on politician profile pages ("Grand Total (BallotPedia)"). Used as a secondary sort key on the Representatives page (descending within same grade tier).
- **Current Position vs. Running For Position**: `politician_profiles` now has a separate nullable `target_position_id` FK (alongside the existing `position_id` = current/held role). When set, it means the politician is running for a *different* seat than they currently hold (e.g., a sitting Lt. Governor running for U.S. Senate). All storage functions join both positions using Drizzle `alias()` and return `position` + `targetPosition` objects. Admin edit form has two pickers ("Current Position" / "Running For"). Admin table shows "→ Running for: [title]" in blue beneath the current position. Public profile page shows "Running for: [title]" in blue beneath the current title. Representatives page and zip-search card view both display the running-for note. The CSV candidate importer automatically assigns `targetPositionId` for incumbents (when their existing `positionId` differs from the CSV office). BallotPedia "Refresh Data" scraper detects "running for" text patterns and upcoming-election table rows, then matches the detected office title to an existing position record and auto-sets `targetPositionId`.
- **FEC-Powered Configurable Corruption Grading System**: Full grading pipeline using FEC API data. Formula: `FinalScore = DataScoreWeight × DataScore + PledgeScoreWeight × PledgeScore + CommunityAdjWeight × CommunityAdj`. New DB tables: `grading_algorithm_settings` (single-row config with all weights and grade thresholds), `fec_candidate_totals` (API response cache — avoids rate-limit hammering). New `politician_profiles` columns: `fec_candidate_id`, `numeric_score`, `community_adj`, `grade_explanation` (JSON). DataScore uses FEC metrics: PAC/committee share (penalty), small-dollar share (bonus), individual share (bonus), SIG money (penalty). PledgeScore from ACE sponsors. All weights and grade thresholds (A≥80, B≥60, C≥40, D≥20, F<20) are admin-configurable via sliders on the Algorithm Settings page. "Regrade Profiles" button triggers bulk regrading. FEC Candidate ID auto-looked up during Refresh Data if blank. Numeric score shown as "(X)" in admin table next to letter grade. Profile pages show "X/100" under the grade badge and a collapsible "How was this graded?" section with metric breakdown. API endpoints: `POST /api/admin/politician-profiles/regrade`, `GET|POST /api/admin/grading-settings`, `PATCH /api/admin/politician-profiles/:id/community-adj`. FEC API key stored as `FEC_API_KEY` secret. Cache expires after 48 hours.

- **@ Handle System**: Politician profiles have unique `handle` fields (format: `firstInitial + lastName + '_' + stateAbbr`, lowercase, underscore separator). State extracted from position jurisdiction, national figures get `_us` suffix. Collision avoidance via `_2`, `_3` suffixes. `POST /api/admin/politicians/backfill-handles` bulk-generates missing handles. `GET /api/politicians/search-handle?q=` powers @ mention autocomplete (returns id, handle, fullName, photoUrl, party, office, state).
- **@ Mention Autocomplete**: Post composer textarea detects `@query` patterns at cursor position and fetches suggestions from `/api/politicians/search-handle`. Dropdown shows politician photo, handle, name, office. Selection replaces `@query` with `@handle` in text. Reusable `useMentionAutocomplete` hook and `MentionDropdown` component available for other text inputs.
- **Missing Info Admin Tab**: 4th tab in admin politicians page showing profiles missing state/jurisdiction or corruption grade. Table with missing-field badges. "Backfill Missing Handles" button triggers bulk handle generation. Merge tool section shows pending duplicate candidates with side-by-side comparison and merge/dismiss actions.
- **Duplicate Profile Detection & Merge**: `merge_candidates` DB table tracks potential duplicate politician profiles with `politician_a_id`, `politician_b_id`, `reason`, `status` (pending/merged/dismissed). Admin merge tool shows side-by-side comparison of each pair with "Keep A" / "Keep B" merge buttons and dismiss option. Merge copies missing fields from removed profile to kept profile, then soft-deletes the removed one.
- **Claim Request System**: Users can claim politician profiles. Approval elevates user to `candidate` role, sets `claimed_by_user_id` on the profile, and auto-generates a handle if missing. Reject supports optional reason. Admin Claims tab shows pending count badge.

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

### Payment Integration
- **Stripe**: Subscription management and crowdfunding.
- **React Stripe.js**: Client-side payment components.

### APIs
- **Google Divisions API**: For fetching representative data.
- **ip-api.com**: For IP geolocation.
- **Quiver Quantitative API**: Congressional stock trading data. Bearer token auth via `QUIVER_INSIDER_TRADING` env var. Endpoints: `GET /beta/historical/congresstrading/{name}`, `GET /beta/historical/senatetrading/{name}`. Proxied through backend at `GET /api/politician-profiles/:id/trades`.

### Trading & Demerit System
- **DB Tables**: `trading_flags` (user-submitted insider trading flags with pending/approved/rejected status), `politician_demerits` (admin-assigned negative marks with type/label/description).
- **Profile Page Tabs**: Politician profile now has 4 tabs — Donors (default), Trading, Endorsements, Campaign Promises (Coming Soon). Donors tab contains all existing SuperPAC/FEC contribution data. Trading tab shows Quiver API stock trades grouped by sector with late-disclosure badges and flag-for-insider-trading modal. Endorsements tab shows ACE badges and pledges.
- **Demerit System**: Admin-approved demerits appear as red `ShieldAlert` badges next to SIGs/ACEs on the Representatives page (both table and zip card view) and on the Trading tab of politician profiles.
- **Admin Trading Flags Page**: `/admin/trading-flags` — review pending flags, approve with demerit assignment, or reject. Admin nav includes "Trading Flags" link.
- **API Routes**: `GET /api/politician-profiles/:id/trades` (Quiver proxy), `POST /api/politician-profiles/:id/trades/flag` (submit flag, auth required), `GET /api/politician-profiles/:id/demerits` (public), `GET /api/admin/trading-flags` (admin), `POST /api/admin/trading-flags/:flagId/review` (admin), `POST /api/admin/politician-profiles/:politicianId/demerits` (admin), `DELETE /api/admin/demerits/:demeritId` (admin).

### ACE Badges Module
- **DB Table**: `ace_pledge_requests` — stores ACE pledge submissions with politicianId, sigId, videoUrl, status (pending/approved/rejected), reviewedBy, reviewNote, timestamps.
- **Candidate Profile Module**: "ACE Badges" module available on candidate edit profile page (`/candidate/edit-profile`). Candidates with a claimed politician profile can view their existing pledges and apply for new ACE badges by selecting an ACE SIG and uploading a pledge video.
- **Approval Flow**: Admin reviews pledges at `/admin/ace-pledges`. On approval, a `politician_sig_sponsorships` entry is created with `relationshipType: "ace_pledge"` which feeds into the corruption grade pipeline.
- **Duplicate Prevention**: Backend blocks duplicate pending/approved pledges for the same politician+SIG pair.
- **API Routes**: `POST /api/ace-pledges` (candidate submit), `GET /api/ace-pledges/my` (candidate list own), `GET /api/ace-pledges/politician/:id` (public approved only), `GET /api/admin/ace-pledges` (admin list with status filter), `POST /api/admin/ace-pledges/:id/review` (admin approve/reject).
- **Admin Nav**: "ACE Pledges" link added to admin navigation under the "people" category.