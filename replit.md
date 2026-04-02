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
- **Quiver Quantitative API**: Congressional stock trading data.
- **FEC API**: Federal Election Commission data for corruption grading.
- **US Census Bureau Geocoding API**: For zip code to congressional district lookup.