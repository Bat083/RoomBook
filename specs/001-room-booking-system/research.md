# Phase 0: Research & Technology Decisions

**Feature**: Room Booking System
**Date**: 2026-05-17
**Status**: Complete

## Technical Context Resolution

Based on the feature specification requirements (user authentication, booking management, calendar display, notifications, state machine), this is a **web application** requiring:
- Backend API for business logic and data persistence
- Frontend UI for user interactions
- Database for persistent storage
- Real-time/near-real-time notifications

### Language & Framework Decisions

#### Decision: TypeScript Full-Stack with React + Node.js

**Rationale**:
- **TypeScript**: Type safety critical for booking state machine (7 states + transitions) and concurrent conflict handling
- **React (frontend)**: Component-based architecture suits calendar UI, booking forms, real-time availability updates
- **Node.js/Express (backend)**: JavaScript isomorphism allows shared types between frontend/backend, reducing errors
- **Single language**: Faster development, easier context switching, shared validation logic

**Alternatives Considered**:
- Python (Flask/Django) + React: Strong for backend but requires two languages, slower than Node.js for I/O-bound booking operations
- Ruby on Rails (full-stack): Convention over configuration, but JavaScript ecosystem better for real-time features (WebSockets)
- Go + React: Excellent concurrency for booking conflicts, but smaller ecosystem and higher learning curve

#### Version Targets

- **TypeScript**: 5.4+
- **React**: 18.2+ (concurrent rendering for availability updates)
- **Node.js**: 20 LTS (stable, long-term support)
- **Express**: 4.18+ (battle-tested, middleware ecosystem)

### Database Decision

#### Decision: PostgreSQL 15+

**Rationale**:
- **ACID transactions**: Critical for booking conflict prevention (first-write-wins per EC-001)
- **Row-level locking**: Prevents double-booking via `SELECT ... FOR UPDATE`
- **JSON support**: Flexible for equipment lists, notification metadata
- **Mature ecosystem**: Well-tested ORMs (Prisma, TypeORM), connection pooling
- **Audit capabilities**: Trigger support for change tracking

**Alternatives Considered**:
- **MySQL**: Similar capabilities but weaker JSON support and less robust full-text search (for room/equipment filtering)
- **MongoDB**: Document model doesn't fit relational booking structure (users ↔ bookings ↔ rooms many-to-many)
- **SQLite**: Insufficient for concurrent writes (booking conflicts would fail)

### ORM/Data Access Decision

#### Decision: Prisma 5.x

**Rationale**:
- **Type-safe queries**: Generated TypeScript types match database schema exactly
- **Migration management**: Schema versioning built-in (`prisma migrate`)
- **Transaction support**: Clean API for atomic booking operations
- **Query performance**: Efficient query generation, connection pooling

**Alternatives Considered**:
- **TypeORM**: More mature but heavier, decorator-based syntax less intuitive
- **Knex.js**: Query builder only, no schema management or type generation
- **Raw SQL**: Maximum control but no type safety, error-prone for complex queries

### Testing Strategy

#### Decision: Jest + React Testing Library + Supertest

**Rationale**:
- **Jest**: De facto standard for TypeScript/JavaScript, built-in mocking
- **React Testing Library**: User-centric testing (matches acceptance scenarios)
- **Supertest**: Integration tests for API endpoints (booking creation, conflict handling)
- **Playwright** (optional P2): End-to-end tests for critical user journeys

**Test Coverage Targets** (per Constitution Principle V):
- Unit tests: Business logic (state machine transitions, validation rules)
- Integration tests: API endpoints with database (booking conflicts, VIP authorization)
- Contract tests: Frontend ↔ Backend API schemas
- E2E tests (optional): P1 user story (standard user booking flow)

### Authentication & Authorization

#### Decision: Passport.js with Local Strategy + Express Session

**Rationale**:
- **Passport.js**: Pluggable auth framework, supports multiple strategies
- **Local strategy**: Username/password sufficient for MVP (FR-002 specifies hardcoded superuser)
- **Express Session**: Server-side session storage (secure, no JWT complexity for MVP)
- **Role-based access control**: Simple middleware for VIP room checks (FR-013)

**Security Requirements** (per Constitution):
- Passwords hashed with bcrypt (work factor 12+)
- HttpOnly cookies for session tokens
- CSRF protection via csurf middleware
- Rate limiting on login endpoint (prevent brute force)

**Alternatives Considered**:
- **JWT**: Adds complexity for session revocation, overkill for MVP
- **OAuth2/OIDC**: No requirement for third-party identity providers yet
- **Auth0/Clerk**: External dependency, cost, reduces control over superuser logic

### Notification System

#### Decision: In-App + Email (Nodemailer) + Optional WebSockets

**Rationale**:
- **Email (primary)**: Reliable, asynchronous, meets Assumption 1 (users have email)
- **Nodemailer**: Node.js SMTP client, flexible transports (SMTP, SendGrid, AWS SES)
- **In-app notifications table**: Backup for delivery failures, user notification history
- **WebSockets (optional P3)**: Real-time booking updates in calendar view (nice-to-have)

**Notification Triggers** (FR-015, FR-016, FR-023):
- Booking confirmed → Email organizer + participants
- Booking rejected → Email organizer with alternatives
- Booking cancelled → Email organizer + participants
- No-show detected → Email organizer (ranking penalty notice)

**Alternatives Considered**:
- **Push notifications**: Mobile requirement not in scope
- **SMS**: Cost prohibitive, not justified by requirements
- **Slack/Teams**: Integration complexity, no requirement specified

### State Management (Frontend)

#### Decision: React Context API + React Query

**Rationale**:
- **React Context**: Sufficient for auth state, user profile (no redux complexity)
- **React Query**: Server state caching for availability queries, booking lists (SC-003: <2s response)
- **Optimistic updates**: Instant UI feedback for booking actions (UX per Constitution I)

**Alternatives Considered**:
- **Redux**: Overkill for MVP, boilerplate heavy
- **Zustand**: Good alternative but React Query handles most server state needs
- **MobX**: Observable-based, less common in React ecosystem

### Calendar UI Library

#### Decision: React Big Calendar + date-fns

**Rationale**:
- **React Big Calendar**: Mature, supports multiple views (month/week/day), event rendering
- **date-fns**: Lightweight date manipulation (vs. Moment.js which is deprecated)
- **Timezone support**: date-fns-tz for Assumption 6 (consistent timezone handling)

**Alternatives Considered**:
- **FullCalendar**: Feature-rich but commercial license required for some features
- **Custom calendar**: High effort, reinventing wheel
- **Google Calendar integration**: Out of scope, adds external dependency

### Background Jobs (No-Show Detection)

#### Decision: Node-cron for Scheduled Tasks

**Rationale**:
- **Node-cron**: Simple cron-like scheduler within Node.js process
- **No-show check job**: Runs every 1 minute, queries bookings past start_time+10min without check-in (FR-019)
- **Simplicity**: No external job queue needed for MVP (Redis/RabbitMQ adds operational complexity)

**Alternatives Considered**:
- **BullMQ + Redis**: Production-grade job queue, but overkill for single periodic task
- **Agenda**: MongoDB-backed job queue, but we're using PostgreSQL
- **Serverless cron (AWS EventBridge)**: Requires cloud deployment, adds infrastructure dependency

### Deployment & Platform

#### Decision: Docker + Docker Compose (Development) | Target: Linux Server

**Rationale**:
- **Docker**: Consistent environment across development/production
- **Docker Compose**: Multi-container setup (app, database, optional Redis for sessions)
- **Linux server**: Standard target for Node.js applications, EC2/DigitalOcean/VPS compatible
- **Process manager**: PM2 for production (auto-restart, clustering)

**Alternatives Considered**:
- **Kubernetes**: Over-engineered for single application MVP
- **Heroku/Vercel**: Platform lock-in, cost at scale
- **Bare metal**: Manual setup, no environment consistency

### Performance & Scalability

#### Decision: Connection Pooling + Query Optimization + Caching Strategy

**Rationale**:
- **PgBouncer or Prisma connection pool**: Handle 50+ concurrent users (Constitution IV)
- **Database indexing**: 
  - `bookings(room_id, start_time, end_time)` for conflict checks
  - `bookings(user_id, status)` for user booking lists
  - `rooms(type)` for VIP filtering
- **Redis cache (optional P2)**: Room availability results (5-minute TTL), reduces DB load
- **Query limits**: Pagination (100 bookings per page per Constitution Quality Standards)

**Performance Targets** (mapped from Success Criteria):
- **SC-001**: Booking flow <2 minutes → Target <500ms API responses
- **SC-003**: Availability query <2s → Target <1s (p95) via indexes + caching
- **SC-004**: Notification delivery <5s → Async job queue with 3s timeout

### Concurrency & Conflict Handling

#### Decision: Optimistic Locking with Retry Logic

**Rationale**:
- **Optimistic locking**: Prisma's `@@unique` constraint on `bookings(room_id, start_time, end_time)` range overlap check
- **Transaction isolation**: `SERIALIZABLE` or `REPEATABLE READ` for booking creation
- **First-write-wins**: Database constraint violation triggers rollback (EC-001)
- **Client retry**: Frontend retries once with exponential backoff, then shows alternatives

**Alternatives Considered**:
- **Pessimistic locking**: `SELECT ... FOR UPDATE` on room row, but reduces throughput
- **Distributed locks (Redis)**: Adds complexity, not needed for PostgreSQL ACID guarantees
- **Event sourcing**: Over-engineered, rebuild state complexity not justified

### Power Outage Detection (EC-002)

#### Decision: Health Check Endpoint + External Monitoring

**Rationale**:
- **Health check**: `/health` endpoint returns uptime, last database write timestamp
- **External monitor**: UptimeRobot/StatusCake pings every 30s, logs downtime
- **Grace period extension**: On app startup, query monitor API for recent downtime, extend no-show grace periods accordingly
- **Assumption**: External monitor provides downtime data via API (UptimeRobot does)

**Alternatives Considered**:
- **UPS reporting**: Requires hardware integration, not software-controllable
- **Self-monitoring**: Can't detect own downtime (obvious limitation)
- **Manual override**: Admin panel to mark outage periods (manual process, error-prone)

## Technology Stack Summary

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Language** | TypeScript | 5.4+ | Type safety across stack |
| **Frontend** | React | 18.2+ | UI components, calendar |
| **Backend** | Node.js + Express | 20 LTS + 4.18 | API server, business logic |
| **Database** | PostgreSQL | 15+ | Persistent storage, ACID transactions |
| **ORM** | Prisma | 5.x | Type-safe queries, migrations |
| **Auth** | Passport.js | 0.7+ | Authentication, session management |
| **Testing** | Jest + RTL + Supertest | Latest | Unit, integration, E2E tests |
| **Notifications** | Nodemailer | 6.9+ | Email delivery |
| **Calendar UI** | React Big Calendar | 1.8+ | Calendar rendering |
| **Date Handling** | date-fns | 2.30+ | Date manipulation, timezone |
| **Background Jobs** | Node-cron | 3.0+ | No-show detection cron |
| **Deployment** | Docker + PM2 | Latest | Containerization, process management |

## Architecture Pattern

**Pattern**: Layered Architecture (Presentation → Service → Data Access)

```text
Frontend (React)
    ↓ HTTP/REST
Backend (Express)
    ├── Controllers (request handling, validation)
    ├── Services (business logic, state machine)
    ├── Repositories (Prisma data access)
    └── Middleware (auth, error handling)
    ↓
Database (PostgreSQL)
```

**Rationale**: 
- **Clear separation of concerns**: Easy to test business logic independently
- **Constitution compliance**: Access control middleware enforces VIP checks at controller layer
- **Scalability path**: Can extract services into microservices later if needed

## Open Questions for Implementation

1. **Timezone handling**: Store times in UTC and convert to user timezone (recommended), or enforce single system timezone?
   - **Recommendation**: UTC storage + user timezone conversion (more flexible for future expansion)

2. **Notification failure handling**: Retry strategy for failed email delivery?
   - **Recommendation**: 3 retries with exponential backoff (1s, 5s, 25s), then log failure and create in-app notification

3. **Room data seeding**: How are initial 8 normal + 2 VIP rooms created?
   - **Recommendation**: Migration script with seed data (can be customized per deployment)

4. **Ranking display**: Where is user ranking score shown?
   - **Recommendation**: User profile page (read-only for MVP, editable by admin later)

5. **Alternative suggestions (FR-016)**: Algorithm for finding alternative rooms/times?
   - **Recommendation**: Query next 3 available slots for same capacity within ±2 hours, sort by proximity to requested time

## Phase 0 Complete

All NEEDS CLARIFICATION items resolved with concrete technology decisions. Ready for Phase 1 (data model, contracts, quickstart).
