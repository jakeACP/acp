# ACP Social Democracy Application

## Overview

This is a full-stack social democracy platform designed to serve as the central hub for a grassroots, subscription-funded political movement (the Anti-Corruption Party). The application provides comprehensive tools for democratic participation including voting, polling, group management, candidate profiles, and community engagement.

**NEW FEATURES ADDED**: 
- **Blockchain Transparency System**: All votes are cryptographically secured and publicly verifiable
- **Ranked Choice Voting**: Advanced voting system for fairer elections with instant runoff calculations
- **Enhanced Poll Creation**: Support for both simple and ranked choice voting methods

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite with hot module replacement

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Authentication**: Passport.js with local strategy and session-based auth
- **API Design**: RESTful endpoints with consistent error handling
- **Database ORM**: Drizzle ORM for type-safe database interactions
- **Session Management**: Express sessions with PostgreSQL session store

### Database Design
- **Database**: PostgreSQL (configured for Neon serverless)
- **Schema**: Comprehensive relational design covering:
  - Users with role-based access (admin, moderator, citizen, candidate)
  - Posts with tags and engagement metrics
  - Polls with JSON-stored options and voting system
  - Groups for community organization
  - Comments and likes for social interaction
  - Candidates with profiles and proposals
  - Direct messaging system

## Key Components

### Authentication System
- **Strategy**: Session-based authentication using Passport.js
- **Password Security**: Scrypt hashing with salt for secure password storage
- **Role Management**: Four distinct user roles with different permissions
- **Protected Routes**: Client-side route protection with automatic redirects

### Social Feed System
- **Post Types**: Regular posts, polls, and announcements
- **Engagement**: Like/unlike functionality and comment threading
- **Tagging**: Array-based tag system for content categorization
- **Real-time Updates**: Query invalidation for immediate UI updates

### Voting & Polling System
- **Simple Voting**: Traditional one-vote-per-person polls with real-time results
- **Ranked Choice Voting**: Advanced instant runoff voting with preference ranking
- **Blockchain Verification**: Cryptographic security and public auditability
- **Vote Tracking**: Transparent vote history with anonymized user identification
- **Poll Management**: Active/inactive states with configurable end dates
- **Results Display**: Real-time vote counting with detailed round-by-round analysis

### Group Management
- **Community Organization**: Topic-based and location-based groups
- **Membership System**: Join/leave functionality with member tracking
- **Group Categories**: Predefined categories (climate, education, corruption, healthcare)
- **Discussion Forums**: Group-specific content and conversations

### Event Management System
- **Event Creation**: Comprehensive event creation with venue, virtual, and hybrid options
- **Location-Based Discovery**: Filter events by city, state, and geographical regions
- **Tag-Based Organization**: Events categorized by tags (Town Hall, Rally, Workshop, etc.)
- **Registration System**: User registration with status tracking (attending, maybe, pending)
- **Capacity Management**: Optional attendee limits with real-time capacity tracking
- **Virtual Event Support**: Integration with video conferencing platforms
- **Event Analytics**: Track attendance, engagement, and event success metrics

### Candidate Portal
- **Profile Management**: Comprehensive candidate information display
- **Proposal System**: Platform for sharing policy positions
- **Community Integration**: Endorsement and engagement tracking
- **Candidacy Declaration**: Self-service candidate registration

## Data Flow

### Client-Server Communication
- **API Layer**: RESTful endpoints with consistent JSON responses
- **Error Handling**: Centralized error management with user-friendly messages
- **Loading States**: React Query provides built-in loading and error states
- **Caching Strategy**: Infinite stale time with manual invalidation

### Authentication Flow
1. User submits credentials via login form
2. Server validates against database using scrypt comparison
3. Passport.js establishes session with PostgreSQL session store
4. Client receives user object and updates global auth state
5. Protected routes automatically redirect unauthenticated users

### Data Validation
- **Client-side**: Zod schemas for form validation with React Hook Form
- **Server-side**: Drizzle schema validation for database operations
- **Type Safety**: End-to-end TypeScript for compile-time error prevention

## External Dependencies

### Database Infrastructure
- **Neon Database**: Serverless PostgreSQL with connection pooling
- **WebSocket Support**: Real-time capabilities for future enhancements

### UI Framework Dependencies
- **Radix UI**: Accessible, unstyled component primitives
- **Lucide Icons**: Consistent icon system throughout the application
- **Tailwind CSS**: Utility-first CSS framework with design system

### Development Tools
- **ESBuild**: Fast bundling for production builds
- **Vite**: Development server with hot module replacement
- **TSX**: TypeScript execution for development server

### Payment Integration (Prepared)
- **Stripe**: Ready for subscription management and crowdfunding
- **React Stripe.js**: Client-side payment component integration

## Deployment Strategy

### Production Build Process
1. **Frontend**: Vite builds optimized React bundle to `dist/public`
2. **Backend**: ESBuild bundles server code to `dist/index.js`
3. **Database**: Drizzle migrations applied via `db:push` command
4. **Assets**: Static files served from built public directory

### Environment Configuration
- **Database URL**: Required environment variable for PostgreSQL connection
- **Session Secret**: Required for secure session management
- **Development Mode**: Automatic Vite integration with dev server
- **Production Mode**: Optimized builds with static file serving

### Scalability Considerations
- **Database**: Serverless PostgreSQL scales automatically
- **Session Storage**: PostgreSQL-backed sessions for horizontal scaling
- **Static Assets**: Optimized builds ready for CDN deployment
- **API Design**: Stateless endpoints suitable for load balancing

The application is designed as a modern, scalable platform that can grow from a small community tool to a large-scale democratic participation system while maintaining security, performance, and user experience standards.

## Recent Updates (October 2025)

### Profile Bio/About Me Module (October 2025)
- **Bio Module Added**: New "About Me" section appears as the first module on all user profiles
- **Editable Interface**: Profile owners can write and update their bio with an easy-to-use text area
- **Public Display**: Visitors can read user bios to learn about community members
- **API Integration**: New `/api/profile/bio` endpoint for saving bio updates
- **Persistent Storage**: Bio text is saved to database and displayed across sessions
- **User-Friendly**: Includes helpful placeholder text to guide users in writing their bio

### Clickable Author Names (October 2025)
- **Profile Links**: Post and comment author names are now clickable links to user profiles
- **Better Navigation**: Users can easily discover and visit profiles of people they interact with
- **Improved UX**: Hovering over author names shows visual feedback with color transition
- **Debug Logging**: Added logging to track auto-friending feature when users register with invite links

### Open Registration System (October 2025)
- **Invitation System Made Optional**: Registration no longer requires an invitation code
- **Bootstrap Admin Feature**: First user to register automatically receives admin privileges
- **Flexible Authentication**: Users can still use invitation links if provided, but can also register directly
- **Production Access**: Resolves lockout issues where published apps couldn't be accessed without invite codes
- **Security Enhancement**: Ensures at least one admin user exists for system management

## Recent Updates (January 2025)

### Events System Implementation (January 2025)
- **Comprehensive Events Feature**: Full event management system with location-based filtering
- **Database Schema**: Added events and event_attendees tables with proper relations and indexing
- **Location Filtering**: Events can be filtered by city, state, and tags for targeted discovery
- **Event Registration**: Users can register for/unregister from events with status tracking
- **Event Creation**: Full event creation with venue details, virtual options, and attendee limits
- **Advanced Filtering**: Support for tag-based filtering and location-specific event discovery
- **Navigation Integration**: Events page added to main navigation with mobile-responsive design

### Development Tool Cleanup (January 2025)
- **Removed Seed Button**: Eliminated "Add Sample Data" button and `/api/seed` endpoint due to duplicate key errors
- **Cleaner Interface**: Streamlined main feed without development-only components
- **User Experience**: Removed potential confusion from seeding functionality that could break with existing data


### Blockchain Transparency Integration
- **Vote Verification System**: Each vote receives a cryptographic hash for independent verification
- **Merkle Tree Structure**: Votes are organized in tamper-proof blockchain blocks
- **Public Audit Trail**: Complete transparency without compromising voter privacy
- **Chain Integrity Checks**: Automatic validation of blockchain consistency

### Ranked Choice Voting Implementation
- **Instant Runoff Algorithm**: Fair elimination-based winner determination
- **Drag-and-Drop Interface**: Intuitive preference ranking for voters
- **Real-time Results**: Round-by-round elimination visualization
- **Tie-Breaking Logic**: Sophisticated handling of tied scenarios

### Enhanced User Experience
- **Advanced Poll Creation**: Support for multiple voting methods and blockchain verification
- **Visual Vote Tracking**: Progress bars, percentages, and detailed analytics
- **Mobile-Responsive Design**: Optimized interface for all device types
- **Accessibility Features**: Screen reader support and keyboard navigation

The platform now serves as a cutting-edge example of transparent, fair, and technologically advanced democratic participation.

## Known Issues & Solutions (January 2025)

### Google Civic Information API Changes
- **Issue**: Google retired the Representatives API endpoint in 2025, causing 404 errors when trying to fetch detailed representative contact information
- **Solution**: Implemented hybrid approach using Google's working Divisions API + curated federal representative data + official government links
- **Result**: Users get accurate federal representatives (President Biden, VP Harris) with real contact info, plus clear guidance to find state/local officials through official sources

### User Expectations vs API Limitations  
- **User Expectation**: Complete representative contact database downloadable from API
- **Reality**: Google's retirement of the endpoint means no single API provides comprehensive representative data
- **Approach**: Standardized representative structure (President, VP, 2 Senators, 1 House Rep, Governor per person) with direct links to authoritative sources

## Visual Identity Integration (January 2025)

### Anti-Corruption Party Logo Implementation
- **Logo Added**: Integrated official ACP logo throughout the application interface
- **Key Locations**: Navigation header, authentication pages, 404 error page, user profiles, favicon
- **Brand Consistency**: Maintains professional appearance while reinforcing ACP identity
- **User Recognition**: Clear visual association with Anti-Corruption Party movement and values

## Security & Account Management Updates (January 2025)

### Change Password Feature Implementation
- **Secure Password Updates**: Complete change password functionality with current password verification
- **Backend Security**: Proper password hashing using scrypt with salt for new passwords
- **Frontend Interface**: User-friendly settings page accessible through navigation dropdown
- **Error Handling**: Comprehensive validation and user feedback for password requirements
- **Database Integration**: New updateUserPassword method in storage layer for secure updates

### Authentication Improvements
- **Duplicate Registration Fix**: Enhanced registration to check both username and email uniqueness
- **Error Handling**: Improved authentication error messages and try-catch blocks
- **Type Safety**: Corrected user ID types from number to string for proper session handling
- **Settings Navigation**: Integrated settings page into main application routing and navigation