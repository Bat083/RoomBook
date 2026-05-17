# Implementation Plan: Room Booking System

**Branch**: `001-room-booking-system` | **Date**: 2026-05-17 | **Spec**: [spec.md](spec.md)

## Summary

Build a web-based room booking system supporting two user types (standard and VIP) with authentication, real-time availability checking, booking state management, conflict prevention, notifications, and automated no-show detection. The system enforces booking duration limits (15 min - 8 hours), VIP room authorization, and handles concurrent booking conflicts using first-write-wins strategy at the database level.

**Technical Approach**: TypeScript full-stack (React frontend + Node.js/Express backend) with PostgreSQL database, Prisma ORM, Passport.js authentication, and Node-cron for scheduled tasks. Layered architecture with clear separation between presentation, business logic, and data access layers.

## Technical Context

**Language/Version**: TypeScript 5.4+

**Primary Dependencies**: 
- Frontend: React 18.2, React Big Calendar, React Query, date-fns
- Backend: Node.js 20 LTS, Express 4.18, Passport.js 0.7, Nodemailer 6.9, Node-cron 3.0
- Database: PostgreSQL 15+, Prisma 5.x

**Storage**: PostgreSQL with ACID transactions for booking conflict prevention

**Testing**: Jest (unit), React Testing Library (component), Supertest (integration), Playwright (E2E - optional)

**Target Platform**: Linux server (Docker deployment with PM2 process manager)

**Project Type**: Web application (separate frontend and backend)

**Performance Goals**: 
- Booking creation: <500ms API response
- Availability query: <1s p95 (target for SC-003: <2s)
- Notification delivery: <5s (async with timeout)

**Constraints**: 
- Handle 50+ concurrent users without errors (Constitution IV)
- Prevent 100% of double-bookings (SC-002)
- No-show detection within 10-minute grace period (FR-019)

**Scale/Scope**: 
- MVP: 10 rooms (8 normal, 2 VIP)
- Expected users: 50-200 concurrent at peak
- Bookings: ~500 per day (estimated)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Check (✅ All Passed)

| Principle | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| **I. User-First Experience** | Single-page booking flow | ✅ PASS | React calendar component with inline booking form |
| **II. Data Integrity** | Prevent double-bookings | ✅ PASS | PostgreSQL `SERIALIZABLE` transactions + unique constraints |
| **II. Data Integrity** | Audit trail | ✅ PASS | All entities have `created_at`, `updated_at` timestamps |
| **III. Access Control** | VIP room authorization | ✅ PASS | Middleware + service layer checks, no bypass via direct API |
| **IV. Availability** | Handle 50 concurrent users | ✅ PASS | Connection pooling (20 connections), horizontal scaling path |
| **IV. Reliability** | <2s booking, <1s availability | ✅ PASS | Indexed queries, optional Redis caching for Phase 2 |
| **V. Test Coverage** | Critical path integration tests | ✅ PASS | Integration tests for booking conflicts, VIP authorization planned |

### Post-Design Check (✅ All Passed)

| Principle | Verification | Status | Evidence |
|-----------|--------------|--------|----------|
| **I. User-First Experience** | All booking options visible | ✅ PASS | Quickstart guide shows single-form design |
| **II. Data Integrity** | Atomic transactions implemented | ✅ PASS | Data model specifies `$transaction` usage + isolation level |
| **II. Data Integrity** | Audit columns present | ✅ PASS | Prisma schema includes `created_at`, `updated_at` on all entities |
| **III. Access Control** | Dual-layer auth enforcement | ✅ PASS | API contracts show middleware + service authorization checks |
| **III. Access Control** | No client-side bypass | ✅ PASS | VIP checks on every request (never cached), FK constraints prevent data manipulation |
| **IV. Availability** | Connection pool configured | ✅ PASS | Research.md recommends 20 connections for 50+ concurrent users |
| **IV. Reliability** | Query optimization | ✅ PASS | Data model defines composite indexes on `(room_id, start_time, end_time)` |
| **V. Test Coverage** | Test patterns documented | ✅ PASS | Quickstart guide includes unit/integration/E2E test examples |

**Conclusion**: No constitution violations. Design aligns with all principles.

## Project Structure

### Documentation (this feature)

```text
specs/001-room-booking-system/
├── spec.md              # Feature specification (requirements, user stories, success criteria)
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0: Technology decisions and rationale
├── data-model.md        # Phase 1: Database schema, entities, relationships, Prisma schema
├── quickstart.md        # Phase 1: Developer onboarding guide (setup, patterns, testing)
├── contracts/           # Phase 1: API contracts
│   └── api-endpoints.md # REST API documentation (request/response formats, error codes)
├── checklists/          # Quality validation
│   └── requirements.md  # Specification completeness checklist
└── tasks.md             # Phase 2: Implementation tasks (generated by /speckit-tasks - NOT created yet)
```

### Source Code (repository root)

See [quickstart.md](quickstart.md) for complete project structure. Key directories:

```text
RoomBook/
├── backend/            # Node.js/Express API server
│   ├── src/            # Controllers, services, repositories, middleware
│   ├── prisma/         # Database schema, migrations, seed
│   └── tests/          # Integration and unit tests
├── frontend/           # React 18 SPA
│   ├── src/            # Components, pages, services, hooks
│   └── tests/          # Component and E2E tests
└── specs/              # Feature documentation (this directory)
```

**Structure Decision**: Web application (separate frontend and backend) chosen because:
1. Feature requires interactive calendar UI (browser-based)
2. API can be reused for future mobile app
3. Clear separation of concerns (independent team work)
4. Frontend and backend can scale independently

## Complexity Tracking

> **No violations found during constitution check. This section is empty.**

## Design Artifacts

All design decisions and technical details are documented in dedicated files:

### Phase 0: Research ✅ COMPLETE
- **File**: [research.md](research.md)
- **Content**: Technology stack decisions, alternatives considered, rationale
- **Key Decisions**: TypeScript full-stack, PostgreSQL, Prisma, Passport.js, Node-cron

### Phase 1: Design ✅ COMPLETE
- **Files**: 
  - [data-model.md](data-model.md) - 5 entities, Prisma schema, query patterns
  - [contracts/api-endpoints.md](contracts/api-endpoints.md) - 15 REST endpoints
  - [quickstart.md](quickstart.md) - Developer onboarding, key patterns, testing strategy

## Critical Implementation Patterns

See [quickstart.md](quickstart.md) for complete pattern details. Key patterns:

1. **Conflict Detection**: `SERIALIZABLE` transaction isolation + indexed conflict query
2. **State Machine**: Centralized state transition function with validation and side effects
3. **Authorization**: Defense-in-depth (middleware + service layer checks)
4. **Notifications**: Fire-and-forget async sending with fallback to in-app

## Testing Strategy

See [quickstart.md](quickstart.md) for complete testing strategy and examples.

**Coverage Targets**:
- Unit Tests: 70% (services, utils)
- Integration Tests: 25% (API endpoints, database)
- E2E Tests: 5% (P1 user story)

**Critical Test Cases** (Constitution V):
- Successful booking flow
- Conflict rejection (EC-001 first-write-wins)
- VIP authorization (FR-013 standard user rejected, VIP user accepted)
- Duration validation (FR-010, FR-011)
- State transitions (check-in, cancellation, no-show)

## Next Steps

1. ✅ **Phase 0 Complete**: Technology research documented in research.md
2. ✅ **Phase 1 Complete**: Data model, API contracts, quickstart guide created
3. **Run `/speckit-tasks`**: Generate dependency-ordered task list for implementation
4. **Review artifacts**: Team reviews spec, plan, data model, API contracts
5. **Begin implementation**: Follow tasks.md checklist, starting with infrastructure setup
6. **Continuous testing**: Add tests incrementally (TDD for business logic)
7. **Constitution compliance**: Verify gates before merging

## Summary

This plan provides a complete blueprint for implementing the room booking system with:
- **Clear architecture**: Layered design with separation of concerns
- **Proven patterns**: State machine, conflict detection, authorization layering
- **Constitution compliance**: All 5 principles validated pre- and post-design
- **Comprehensive documentation**: 5 design artifacts (research, data model, contracts, quickstart, plan)
- **Risk mitigation**: First-write-wins for conflicts, defense-in-depth auth, async notifications

**Estimated Effort**: ~4-6 weeks for P1 (core booking) + 2-3 weeks for P2/P3 (check-in, no-show, cancellation) with 2 full-stack developers.

**Risk Assessment**: Low - well-understood technology stack, clear requirements, comprehensive test strategy.

---

## Quick Reference

- **Spec**: [spec.md](spec.md) - Full requirements
- **Tech Decisions**: [research.md](research.md) - Technology stack and rationale
- **Database**: [data-model.md](data-model.md) - Schema, entities, relationships
- **API**: [contracts/api-endpoints.md](contracts/api-endpoints.md) - REST API reference
- **Developer Guide**: [quickstart.md](quickstart.md) - Setup, patterns, testing
- **Constitution**: [.specify/memory/constitution.md](../../.specify/memory/constitution.md) - Project principles
