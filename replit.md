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
- **Social Feed System**: Supports posts, polls, announcements, with likes, comments, tagging, real-time updates, and a floating video player.
- **Voting & Polling System**: Includes simple voting, advanced Ranked Choice Voting, and Blockchain Verification via Merkle Tree for cryptographic security.
- **Congress Import System**: Admin one-click import of all 535 Congress members from a TrackAIPAC XLSX file. Creates politician profiles, congressional positions, 53 Israel lobby group SIGs, and SIG sponsorship links. Corruption grades auto-assigned based on total lobby money received. "Rejects AIPAC" badge for 16 pledged politicians.
- **Current Representatives Lookup**: DB-backed zip code → congressional district lookup using the free US Census Bureau Geocoding API (no key required). Returns the user's 2 senators + house rep from our politician profiles DB with corruption grades, party, and lobby money data. Navigation tab renamed "Current Reps".
- **Group Management**: Topic and location-based groups with discussion forums.
- **Event Management System**: Comprehensive event creation, location-based discovery, and registration.
- **Candidate Portal**: Profile management, proposal sharing, community integration, and self-service registration, including detailed politician profiles with corruption grading and claimable pages.
- **Data Flow**: Client-server communication via RESTful JSON APIs, centralized error handling, and caching.
- **Data Validation**: Client-side (Zod, React Hook Form) and server-side (Drizzle schema) validation with end-to-end TypeScript.
- **Security & Account Management**: Secure password updates, enhanced registration, CSRF protection (double-submit cookie via csrf-csrf), session cookies with SameSite=Strict, and 2FA (TOTP/SMS with challenge tokens).
- **Scalability**: Designed for scalability with serverless PostgreSQL and optimized static assets.
- **Content Systems**: WYSIWYG editor for articles and long-form content, integrated into the feed.
- **Real-time Features**: Live trending topics based on hashtags and inline display of event details in posts.
- **Admin Tools**: IP tracking for user registration/login and comprehensive user management.
- **Influence Map (SIG Directory)**: Public `/sigs` directory and `/sigs/:tag` profile pages for 62 special interest groups (Super PACs, Dark Money, Industry PACs, Pledges, Labor Unions, Endorsement Orgs). Schema extended with `tag`, `sentiment`, `dataSourceName`, `dataSourceUrl` columns. Admin "Seed 62 SIGs" button upserts all 62 from XLSX data. SIG badges on politician profiles are clickable links. "Influence Map" added to main navigation. Public APIs: `GET /api/sigs`, `GET /api/sigs/:tag`.
- **State Admin System**: New `state_admin` role (between admin and moderator) with `managedState` field (2-letter state code e.g. "MN"). Admins assign via User Management → "Manage Role" dialog. State admins access the **State Data Portal** (`/admin/state-data`) with downloadable CSV templates for Candidates, Representatives, and SIGs. `ensureStateAdmin` middleware guards data-import routes. Download template buttons added to SIGs, Politicians, and Representatives admin pages. Template utility in `client/src/lib/download-template.ts`.

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