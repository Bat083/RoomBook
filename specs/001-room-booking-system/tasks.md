# Tasks: Room Booking System

**Input**: Design documents from `/specs/001-room-booking-system/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-endpoints.md, quickstart.md

**Tests**: Integration and E2E tests are included per the constitution principle V (test coverage requirements).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

This is a web application with separate frontend and backend:
- Backend: `backend/src/`, `backend/prisma/`, `backend/tests/`
- Frontend: `frontend/src/`, `frontend/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure per plan.md

- [x] T001 Create project directory structure (backend/, frontend/, specs/, docs/)
- [x] T002 Initialize backend Node.js project with package.json and TypeScript 5.4+ configuration
- [x] T003 [P] Initialize frontend React 18.2+ project with TypeScript and Vite
- [x] T004 [P] Configure ESLint and Prettier for both backend and frontend
- [ ] T005 [P] Setup Git hooks with Husky for pre-commit linting
- [x] T006 Create Docker Compose configuration for PostgreSQL 15+ database
- [x] T007 [P] Setup backend directory structure (src/controllers/, src/services/, src/repositories/, src/middleware/, src/types/)
- [x] T008 [P] Setup frontend directory structure (src/components/, src/pages/, src/services/, src/hooks/, src/types/)
- [x] T009 Configure environment variables template (.env.example) for backend
- [x] T010 [P] Configure environment variables template (.env.example) for frontend

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T011 Initialize Prisma 5.x in backend/prisma/ with PostgreSQL provider
- [x] T012 Create Prisma schema in backend/prisma/schema.prisma with User, Room, Booking, BookingParticipant, Notification models from data-model.md
- [ ] T013 Create initial database migration using `prisma migrate dev`
- [x] T014 Create database seed script in backend/prisma/seed.ts (10 rooms: 8 normal, 2 VIP; 1 superuser with credentials from FR-002)
- [x] T015 Install and configure Express 4.18+ in backend/src/app.ts with middleware (cors, helmet, express-session)
- [x] T016 [P] Install and configure Passport.js 0.7+ with local strategy in backend/src/config/passport.ts
- [x] T017 [P] Setup session store with express-session and connect-pg-simple in backend/src/config/session.ts
- [x] T018 [P] Configure Nodemailer 6.9+ for email notifications in backend/src/config/email.ts
- [x] T019 Create authentication middleware in backend/src/middleware/auth.ts (isAuthenticated, isVIP)
- [x] T020 [P] Create error handling middleware in backend/src/middleware/errorHandler.ts
- [x] T021 [P] Create validation middleware using express-validator in backend/src/middleware/validation.ts
- [x] T022 Setup Jest testing framework for backend in backend/jest.config.js
- [x] T023 [P] Setup React Testing Library and Jest for frontend in frontend/jest.config.js
- [x] T024 Install React Big Calendar and date-fns in frontend
- [x] T025 [P] Install React Query for server state management in frontend
- [x] T026 Create base API client service in frontend/src/services/api.ts with axios
- [x] T027 [P] Create auth context provider in frontend/src/contexts/AuthContext.tsx
- [x] T028 Create TypeScript shared types in backend/src/types/ (BookingDTO, UserDTO, RoomDTO, NotificationDTO)
- [x] T029 [P] Setup rate limiting middleware with express-rate-limit in backend/src/middleware/rateLimit.ts
- [x] T030 Create health check endpoint in backend/src/controllers/healthController.ts for power outage detection (EC-002)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Standard User Room Booking (Priority: P1) 🎯 MVP

**Goal**: Standard users can log in, select date/time, browse available normal rooms, create bookings, and receive confirmation notifications. Bookings appear in the calendar.

**Independent Test**: Create standard user account, log in, select date/time range, filter rooms by capacity/equipment, complete booking, verify confirmation notification and calendar entry.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T031 [P] [US1] Create integration test for POST /auth/login in backend/tests/integration/auth.test.ts
- [x] T032 [P] [US1] Create integration test for GET /rooms with availability filtering in backend/tests/integration/rooms.test.ts
- [x] T033 [P] [US1] Create integration test for POST /bookings with conflict detection (FR-009, FR-024) in backend/tests/integration/bookings.test.ts
- [x] T034 [P] [US1] Create integration test for duration validation (FR-010, FR-011, FR-012) in backend/tests/integration/bookings.test.ts
- [x] T035 [P] [US1] Create E2E test for complete booking flow (SC-001: <2 min) in frontend/tests/e2e/booking-flow.spec.ts

### Implementation for User Story 1

**Authentication (FR-001, FR-002)**

- [x] T036 [P] [US1] Implement authController.login in backend/src/controllers/authController.ts
- [x] T037 [P] [US1] Implement authController.logout in backend/src/controllers/authController.ts
- [x] T038 [P] [US1] Implement authController.getCurrentUser in backend/src/controllers/authController.ts
- [x] T039 [US1] Register auth routes in backend/src/routes/authRoutes.ts

**Room Availability (FR-005, FR-006, FR-007)**

- [x] T040 [P] [US1] Create RoomRepository in backend/src/repositories/roomRepository.ts with findAvailable method
- [x] T041 [US1] Implement RoomService in backend/src/services/roomService.ts with getAvailableRooms method (SC-003: <2s query)
- [x] T042 [US1] Implement roomController.getRooms in backend/src/controllers/roomController.ts with filters (capacity, equipment, startTime, endTime)
- [x] T043 [P] [US1] Implement roomController.getRoomById in backend/src/controllers/roomController.ts
- [x] T044 [US1] Register room routes in backend/src/routes/roomRoutes.ts

**Booking Creation (FR-008, FR-009, FR-010, FR-011, FR-012, FR-014)**

- [x] T045 [P] [US1] Create BookingRepository in backend/src/repositories/bookingRepository.ts with create, findConflicts methods
- [x] T046 [US1] Implement BookingService.createBooking in backend/src/services/bookingService.ts with conflict detection (FR-009, FR-024) using SERIALIZABLE transaction
- [x] T047 [US1] Implement duration validation logic in BookingService (FR-010, FR-011, FR-012)
- [x] T048 [US1] Implement BookingParticipantRepository in backend/src/repositories/bookingParticipantRepository.ts
- [x] T049 [US1] Implement bookingController.createBooking in backend/src/controllers/bookingController.ts
- [x] T050 [P] [US1] Implement bookingController.getBookings in backend/src/controllers/bookingController.ts with pagination
- [x] T051 [P] [US1] Implement bookingController.getBookingById in backend/src/controllers/bookingController.ts
- [x] T052 [US1] Register booking routes in backend/src/routes/bookingRoutes.ts

**Notifications (FR-015, FR-016)**

- [x] T053 [P] [US1] Create NotificationRepository in backend/src/repositories/notificationRepository.ts
- [x] T054 [US1] Implement NotificationService in backend/src/services/notificationService.ts with sendBookingConfirmed and sendBookingRejected methods
- [x] T055 [US1] Integrate notification sending into BookingService.createBooking (fire-and-forget async pattern)
- [x] T056 [US1] Implement alternative room suggestions logic in BookingService for conflict responses (FR-016)

**Calendar Display (FR-017)**

- [x] T057 [P] [US1] Implement calendarController.getCalendarEvents in backend/src/controllers/calendarController.ts
- [x] T058 [US1] Register calendar routes in backend/src/routes/calendarRoutes.ts

**Frontend - Authentication**

- [x] T059 [P] [US1] Create LoginPage component in frontend/src/pages/LoginPage.tsx
- [x] T060 [P] [US1] Create authService with login, logout, getCurrentUser methods in frontend/src/services/authService.ts
- [x] T061 [US1] Implement AuthContext with login, logout, user state in frontend/src/contexts/AuthContext.tsx
- [x] T062 [US1] Create ProtectedRoute component in frontend/src/components/ProtectedRoute.tsx

**Frontend - Room Booking Flow**

- [x] T063 [P] [US1] Create RoomListPage component with date/time selection in frontend/src/pages/RoomListPage.tsx
- [x] T064 [P] [US1] Create RoomCard component with room details in frontend/src/components/RoomCard.tsx
- [x] T065 [P] [US1] Create BookingForm component with participant selection in frontend/src/components/BookingForm.tsx
- [x] T066 [US1] Create roomService with getRooms, getRoomById methods in frontend/src/services/roomService.ts
- [x] T067 [US1] Create bookingService with createBooking, getBookings, getBookingById methods in frontend/src/services/bookingService.ts
- [x] T068 [US1] Implement React Query hooks for room availability queries in frontend/src/hooks/useRooms.ts
- [x] T069 [P] [US1] Implement React Query hooks for booking mutations in frontend/src/hooks/useBookings.ts
- [x] T070 [US1] Add conflict error handling with alternative suggestions display in BookingForm component

**Frontend - Calendar Display**

- [x] T071 [P] [US1] Create CalendarPage component with React Big Calendar in frontend/src/pages/CalendarPage.tsx
- [x] T072 [US1] Create calendarService with getCalendarEvents method in frontend/src/services/calendarService.ts
- [x] T073 [US1] Implement React Query hook for calendar data in frontend/src/hooks/useCalendar.ts
- [x] T074 [US1] Style calendar events with status-based colors in CalendarPage component

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - VIP User Room Booking (Priority: P2)

**Goal**: VIP users (superuser) can book both normal and VIP rooms. Standard users attempting VIP room bookings are rejected with INSUFFICIENT_CLEARANCE error.

**Independent Test**: Log in as superuser, select VIP room, complete booking, verify authorization. Log in as standard user, attempt VIP room booking, verify rejection with INSUFFICIENT_CLEARANCE.

### Tests for User Story 2

- [X] T075 [P] [US2] Create integration test for VIP room authorization (FR-013) in backend/tests/integration/vip-authorization.test.ts
- [X] T076 [P] [US2] Create integration test for standard user VIP room rejection in backend/tests/integration/vip-authorization.test.ts

### Implementation for User Story 2

**Backend - VIP Authorization (FR-003, FR-004, FR-013)**

- [X] T077 [US2] Implement VIP room authorization check in BookingService.createBooking (before conflict detection)
- [X] T078 [US2] Add INSUFFICIENT_CLEARANCE error response in bookingController.createBooking
- [X] T079 [US2] Update RoomService.getAvailableRooms to filter by user type (VIP sees all, standard sees only normal)

**Frontend - VIP Differentiation**

- [X] T080 [P] [US2] Add VIP badge to RoomCard component for VIP rooms in frontend/src/components/RoomCard.tsx
- [X] T081 [US2] Filter room list by user type in RoomListPage component (hide VIP rooms for standard users)
- [X] T082 [US2] Add INSUFFICIENT_CLEARANCE error message display in BookingForm component

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Check-in and No-Show Handling (Priority: P3)

**Goal**: Users can check in to confirmed bookings. System automatically transitions bookings to NO_SHOW if no check-in occurs within 10 minutes of start time, reduces ranking, and releases the room.

**Independent Test**: Create confirmed booking, check in on time (transitions to IN_PROGRESS). Create confirmed booking, wait 10+ minutes without check-in (transitions to NO_SHOW, releases slot, reduces ranking).

### Tests for User Story 3

- [X] T083 [P] [US3] Create integration test for POST /bookings/:id/check-in in backend/tests/integration/check-in.test.ts
- [X] T084 [P] [US3] Create integration test for no-show detection cron job in backend/tests/integration/no-show.test.ts
- [X] T085 [P] [US3] Create integration test for ranking score reduction (FR-020) in backend/tests/integration/no-show.test.ts

### Implementation for User Story 3

**Backend - Check-in (FR-018)**

- [X] T086 [US3] Implement state machine transition validator in backend/src/services/stateMachine.ts
- [X] T087 [US3] Implement BookingService.checkIn method with state transition validation (CONFIRMED → IN_PROGRESS)
- [X] T088 [US3] Implement bookingController.checkIn in backend/src/controllers/bookingController.ts
- [X] T089 [US3] Add check-in route POST /bookings/:id/check-in in backend/src/routes/bookingRoutes.ts

**Backend - No-Show Detection (FR-019, FR-020)**

- [X] T090 [US3] Create NoShowDetectionService in backend/src/services/noShowDetectionService.ts with detectNoShows method
- [X] T091 [US3] Implement BookingService.markNoShow method with ranking reduction logic (FR-020)
- [X] T092 [US3] Create cron job in backend/src/jobs/noShowCron.ts using node-cron (runs every 1 minute)
- [X] T093 [US3] Integrate cron job into backend/src/app.ts startup
- [X] T094 [US3] Implement NotificationService.sendNoShowPenalty method

**Backend - Automatic Completion (FR-027)**

- [X] T095 [P] [US3] Create CompletionService in backend/src/services/completionService.ts to transition IN_PROGRESS → COMPLETED when end_time passes
- [X] T096 [US3] Create cron job in backend/src/jobs/completionCron.ts (runs every 5 minutes)
- [X] T097 [US3] Integrate completion cron into backend/src/app.ts startup

**Frontend - Check-in UI**

- [X] T098 [P] [US3] Create CheckInButton component in frontend/src/components/CheckInButton.tsx
- [X] T099 [US3] Add checkIn method to bookingService in frontend/src/services/bookingService.ts
- [X] T100 [US3] Integrate CheckInButton into BookingDetailsPage component in frontend/src/pages/BookingDetailsPage.tsx
- [X] T101 [US3] Add check-in window validation (10-minute grace period) in CheckInButton component

**Frontend - No-Show Display**

- [X] T102 [P] [US3] Add NO_SHOW status badge styling in BookingCard component in frontend/src/components/BookingCard.tsx
- [X] T103 [US3] Display ranking score on user profile page in frontend/src/pages/ProfilePage.tsx

**Checkpoint**: All User Stories 1, 2, and 3 should now be independently functional

---

## Phase 6: User Story 4 - Booking Cancellation (Priority: P3)

**Goal**: Users can cancel confirmed bookings. System transitions booking to CANCELLED, releases room, and notifies organizer and participants.

**Independent Test**: Create confirmed booking, trigger cancellation, verify status changes to CANCELLED, room becomes available, and notifications are sent.

### Tests for User Story 4

- [ ] T104 [P] [US4] Create integration test for DELETE /bookings/:id in backend/tests/integration/cancellation.test.ts
- [ ] T105 [P] [US4] Create integration test for cancellation notifications (FR-023) in backend/tests/integration/cancellation.test.ts

### Implementation for User Story 4

**Backend - Cancellation (FR-021, FR-022, FR-023)**

- [ ] T106 [US4] Implement BookingService.cancelBooking method with state transition validation (CONFIRMED → CANCELLED)
- [ ] T107 [US4] Implement organizer authorization check in BookingService.cancelBooking (only organizer can cancel)
- [ ] T108 [US4] Implement bookingController.deleteBooking in backend/src/controllers/bookingController.ts
- [ ] T109 [US4] Add cancellation route DELETE /bookings/:id in backend/src/routes/bookingRoutes.ts
- [ ] T110 [US4] Implement NotificationService.sendBookingCancelled method

**Frontend - Cancellation UI**

- [ ] T111 [P] [US4] Create CancelBookingButton component in frontend/src/components/CancelBookingButton.tsx
- [ ] T112 [US4] Add cancelBooking method to bookingService in frontend/src/services/bookingService.ts
- [ ] T113 [US4] Integrate CancelBookingButton into BookingDetailsPage component (show only for organizer)
- [ ] T114 [US4] Add cancellation confirmation modal in CancelBookingButton component

**Checkpoint**: All user stories (1-4) should now be independently functional

---

## Phase 7: Notifications & Notification Management

**Goal**: Users can view and manage their notifications (both email and in-app).

**Independent Test**: Trigger booking confirmation, rejection, cancellation, or no-show events and verify notifications are created, displayed, and markable as read.

### Implementation

- [ ] T115 [P] Implement notificationController.getNotifications in backend/src/controllers/notificationController.ts with pagination and unreadOnly filter
- [ ] T116 [P] Implement notificationController.markAsRead in backend/src/controllers/notificationController.ts
- [ ] T117 Register notification routes in backend/src/routes/notificationRoutes.ts
- [ ] T118 [P] Create NotificationList component in frontend/src/components/NotificationList.tsx
- [ ] T119 [P] Create NotificationItem component in frontend/src/components/NotificationItem.tsx
- [ ] T120 Create notificationService with getNotifications, markAsRead methods in frontend/src/services/notificationService.ts
- [ ] T121 Create NotificationsPage in frontend/src/pages/NotificationsPage.tsx
- [ ] T122 Add notification badge with unread count to navigation bar in frontend/src/components/NavBar.tsx

---

## Phase 8: Power Outage Grace Period Extension (EC-002)

**Goal**: System detects power outages and extends no-show grace periods accordingly, preventing false NO_SHOW transitions.

**Independent Test**: Simulate downtime detection by external monitor, verify grace period extension logic in no-show detection.

### Implementation

- [ ] T123 [P] Implement HealthCheckService in backend/src/services/healthCheckService.ts with uptime tracking
- [ ] T124 [P] Create external monitoring integration service in backend/src/services/monitoringService.ts (UptimeRobot API client)
- [ ] T125 Update NoShowDetectionService to query monitoring service for recent downtime before marking NO_SHOW
- [ ] T126 Add grace period extension logic to NoShowDetectionService.detectNoShows
- [ ] T127 Create integration test for power outage grace period extension in backend/tests/integration/power-outage.test.ts

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T128 [P] Add API request/response logging middleware in backend/src/middleware/logger.ts
- [ ] T129 [P] Add Prisma query logging in backend/src/config/database.ts
- [ ] T130 [P] Implement comprehensive input validation for all endpoints using express-validator
- [ ] T131 [P] Add CORS configuration based on environment in backend/src/config/cors.ts
- [ ] T132 [P] Add security headers (helmet) configuration in backend/src/app.ts
- [ ] T133 [P] Implement CSRF protection with csurf middleware in backend/src/middleware/csrf.ts
- [ ] T134 [P] Create API documentation with OpenAPI/Swagger in backend/docs/api.yml
- [ ] T135 [P] Add loading states and skeleton screens to all frontend pages
- [ ] T136 [P] Add error boundary component in frontend/src/components/ErrorBoundary.tsx
- [ ] T137 [P] Implement toast notifications for user feedback in frontend using react-toastify
- [ ] T138 [P] Add responsive design breakpoints for mobile/tablet views
- [ ] T139 [P] Create user profile page in frontend/src/pages/ProfilePage.tsx with ranking display
- [ ] T140 [P] Add booking history pagination in frontend
- [ ] T141 Create Docker production configuration in Dockerfile and docker-compose.prod.yml
- [ ] T142 [P] Create README.md with setup instructions per quickstart.md
- [ ] T143 [P] Add deployment documentation in docs/deployment.md
- [ ] T144 Run constitution compliance validation per plan.md checklist
- [ ] T145 Performance testing for SC-001 (<2 min booking), SC-003 (<2s availability)
- [ ] T146 Security audit for VIP authorization (SC-005: zero unauthorized access)
- [ ] T147 Concurrency testing for first-write-wins behavior (SC-007)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational (Phase 2) - No dependencies on other stories
  - User Story 2 (P2): Can start after Foundational (Phase 2) - Builds on US1 auth and booking logic but independently testable
  - User Story 3 (P3): Can start after Foundational (Phase 2) - Extends US1 bookings with check-in/no-show, independently testable
  - User Story 4 (P3): Can start after Foundational (Phase 2) - Extends US1 bookings with cancellation, independently testable
- **Notifications (Phase 7)**: Can start after Foundational, integrates with all user stories
- **Power Outage (Phase 8)**: Depends on User Story 3 (no-show detection)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Repositories before services
- Services before controllers
- Controllers before routes
- Backend endpoints before frontend integration
- Core implementation before edge case handling
- Story complete before moving to next priority

### Parallel Opportunities

#### Setup Phase (Phase 1)
- T003 (frontend init) ∥ T002 (backend init)
- T004 (linting) ∥ T005 (git hooks) ∥ T007 (backend dirs) ∥ T008 (frontend dirs)
- T009 (backend env) ∥ T010 (frontend env)

#### Foundational Phase (Phase 2)
- T016 (Passport) ∥ T017 (sessions) ∥ T018 (email) after T015 (Express setup)
- T019 (auth middleware) ∥ T020 (error handler) ∥ T021 (validation) after middleware infra ready
- T022 (backend tests) ∥ T023 (frontend tests) ∥ T024 (calendar lib) ∥ T025 (React Query) ∥ T028 (types) ∥ T029 (rate limit)

#### User Story 1 - Tests (can all run in parallel once written)
- T031 ∥ T032 ∥ T033 ∥ T034 ∥ T035

#### User Story 1 - Implementation
- Auth controllers: T036 ∥ T037 ∥ T038
- Room setup: T040 (repository) → T041 (service) → T042 (getRooms) ∥ T043 (getRoomById)
- Booking repositories: T045 ∥ T048
- Booking setup: T046 (service core) → T047 (validation) → T049 ∥ T050 ∥ T051
- Notifications: T053 (repository) → T054 (service) with T055 (integration) and T056 (alternatives)
- Calendar: T057 ∥ T058
- Frontend auth: T059 ∥ T060 → T061 → T062
- Frontend booking: T063 ∥ T064 ∥ T065 after T066, T067 ready
- React Query hooks: T068 ∥ T069
- Calendar frontend: T071 → T072 → T073 → T074

#### User Story 2
- Backend: T077 → T078 ∥ T079
- Frontend: T080 → T081 ∥ T082

#### User Story 3
- Check-in backend: T086 → T087 → T088 ∥ T089
- No-show backend: T090 → T091 → T092 ∥ T093 ∥ T094
- Completion: T095 → T096 ∥ T097
- Frontend: T098 → T099 → T100 ∥ T101
- Display: T102 ∥ T103

#### User Story 4
- Backend: T106 → T107 → T108 ∥ T109 ∥ T110
- Frontend: T111 → T112 → T113 ∥ T114

#### Polish Phase
All tasks marked [P] (T128-T143) can run in parallel

---

## Parallel Example: User Story 1 Implementation

```bash
# After foundational phase is complete, launch User Story 1 tests in parallel:
Task T031: "Integration test for POST /auth/login"
Task T032: "Integration test for GET /rooms with availability"
Task T033: "Integration test for POST /bookings with conflict detection"
Task T034: "Integration test for duration validation"
Task T035: "E2E test for complete booking flow"

# After auth foundation (T015-T021), launch auth controllers in parallel:
Task T036: "Implement authController.login"
Task T037: "Implement authController.logout"
Task T038: "Implement authController.getCurrentUser"

# After repositories are ready (T045, T048), launch booking controllers in parallel:
Task T049: "Implement bookingController.createBooking"
Task T050: "Implement bookingController.getBookings"
Task T051: "Implement bookingController.getBookingById"

# Launch frontend components in parallel after services ready:
Task T063: "Create RoomListPage component"
Task T064: "Create RoomCard component"
Task T065: "Create BookingForm component"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (~2 days)
2. Complete Phase 2: Foundational (~5-7 days) ⚠️ CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (~7-10 days)
4. **STOP and VALIDATE**: Test User Story 1 independently per constitution
5. Deploy/demo if ready → **MVP achieved!**

**Estimated MVP Effort**: ~3-4 weeks with 2 full-stack developers

### Incremental Delivery

1. **Foundation** (Setup + Foundational) → Database, auth, infrastructure ready
2. **MVP** (Add User Story 1) → Standard user booking flow → Test independently → Deploy/Demo
3. **VIP Access** (Add User Story 2) → VIP room authorization → Test independently → Deploy/Demo
4. **Operations** (Add User Story 3) → Check-in and no-show automation → Test independently → Deploy/Demo
5. **Flexibility** (Add User Story 4) → Cancellation flow → Test independently → Deploy/Demo
6. **Polish** (Phase 9) → Production-ready hardening

Each increment adds value without breaking previous functionality.

### Parallel Team Strategy

With 2 full-stack developers:

1. **Together**: Complete Setup + Foundational (critical path, ~1-2 weeks)
2. **Once Foundational is done**:
   - Developer A: User Story 1 (backend + frontend)
   - Developer B: User Story 2 (backend + frontend)
3. **Integration**: Merge and validate stories work independently
4. **Continue**:
   - Developer A: User Story 3
   - Developer B: User Story 4
5. **Together**: Notifications (Phase 7), Power Outage (Phase 8), Polish (Phase 9)

**Estimated Total Effort**: ~6-8 weeks for complete P1-P3 feature set

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story (US1, US2, US3, US4) for traceability
- Each user story should be independently completable and testable
- Verify integration tests FAIL before implementing features (TDD approach)
- Commit after each logical task group or at checkpoints
- Stop at any checkpoint to validate story independently per constitution
- All tasks include specific file paths from plan.md project structure
- Success criteria validation tasks (T145-T147) map to SC-001, SC-003, SC-005, SC-007
- Constitution compliance (T144) ensures all 5 principles are met before production
