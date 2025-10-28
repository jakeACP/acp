# ACP Social Democracy Application

## Overview
This is a full-stack social democracy platform serving as the central hub for a grassroots, subscription-funded political movement (the Anti-Corruption Party). It offers comprehensive tools for democratic participation, including advanced voting mechanisms (Ranked Choice, Blockchain-verified), polling, group management, candidate profiles, and community engagement. The platform aims to be a transparent and fair system for advanced democratic participation.

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

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Authentication**: Passport.js (local strategy, session-based)
- **API Design**: RESTful endpoints
- **Database ORM**: Drizzle ORM
- **Session Management**: Express sessions with PostgreSQL store

### Database Design
- **Database**: PostgreSQL (Neon serverless)
- **Schema**: Comprehensive relational design for users (with roles), posts, polls (with JSON options and voting systems), groups, comments, candidates, and direct messaging.

### Key Features & Technical Implementations
- **Authentication System**: Session-based with Passport.js, Scrypt hashing, role-based access (admin, moderator, citizen, candidate), and protected routes.
- **Social Feed System**: Supports posts, polls, announcements; includes like/unlike, comment threading, tagging, and real-time updates. Features a floating video player.
- **Voting & Polling System**:
    - **Simple Voting**: Traditional one-vote-per-person.
    - **Ranked Choice Voting**: Advanced instant runoff voting with preference ranking and visual results.
    - **Blockchain Verification**: Cryptographic security and public auditability for all votes via a Merkle Tree structure.
    - **Enhanced Poll Creation**: Support for multiple voting methods.
- **Group Management**: Topic and location-based groups with membership and discussion forums.
- **Event Management System**: Comprehensive event creation (venue, virtual, hybrid), location-based discovery, tag-based organization, registration, capacity management, and analytics.
- **Candidate Portal**: Profile management, proposal sharing, community integration, and self-service registration.
- **Data Flow**: Client-server communication via RESTful JSON APIs, centralized error handling, and caching.
- **Data Validation**: Client-side (Zod, React Hook Form) and server-side (Drizzle schema) validation with end-to-end TypeScript.
- **UI/UX Decisions**: Consistent branding with the ACP logo, mobile-responsive design, accessibility features, and keyboard shortcuts for improved workflow.
- **Security & Account Management**: Secure password updates with current password verification and scrypt hashing. Enhanced registration for username/email uniqueness.
- **Scalability**: Designed for scalability with serverless PostgreSQL, PostgreSQL-backed sessions, and optimized static assets for CDN deployment.

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

### Payment Integration (Prepared)
- **Stripe**: Subscription management and crowdfunding.
- **React Stripe.js**: Client-side payment components.

### APIs
- **Google Divisions API**: Used for fetching representative data in a hybrid approach with curated federal data and official government links.

## Recent Updates (October 2025)

### Floating Video Player (October 2025)
- **Picture-in-Picture Mode**: YouTube videos automatically minimize to a floating player in the bottom-right corner when scrolled out of view
- **Intelligent Detection**: Uses IntersectionObserver to detect when a playing video scrolls out of the viewport (triggers when <20% visible)
- **Seamless Controls**: Floating player includes close button and "return to post" button to scroll back to the original location
- **YouTube IFrame API Integration**: Enhanced video player with proper play/pause state tracking for accurate floating behavior
- **Global Context Management**: FloatingVideoProvider ensures only one video floats at a time
- **User Experience**: Continue watching videos while browsing the feed without interruption

### Keyboard Shortcuts (October 2025)
- **Ctrl+Enter Post Submission**: Users can now press Ctrl+Enter while typing in the post creation form to instantly submit their post
- **Improved Workflow**: Faster content creation without needing to click the "Post" button
- **User Experience Enhancement**: Keyboard-first workflow for power users and accessibility

### Politician Profiles System (October 2025)
- **Political Position Management**: Create permanent political positions (e.g., "President of the United States", "Senator from California")
- **Politician Profile Management**: Manage individual politician profiles that can be assigned to positions
- **Photo Upload**: Profile images stored in object storage with 10MB upload limit
- **Term Tracking**: Track term start/end dates, office type, and current/former status
- **Admin Panel**: Comprehensive admin interface for managing both positions and profiles