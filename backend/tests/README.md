# Backend Integration Tests

This directory contains integration tests for the Room Booking System API.

## Test Structure

```
backend/tests/
├── integration/
│   ├── auth.test.ts          # Authentication endpoint tests (T031)
│   ├── rooms.test.ts         # Room availability tests (T032)
│   └── bookings.test.ts      # Booking creation, conflict detection, duration validation (T033, T034)
└── setup.ts                  # Global test configuration
```

## Prerequisites

### 1. Test Database Setup

The tests require a separate PostgreSQL test database to avoid affecting development data.

**Option A: Create test database manually**
```bash
# Connect to PostgreSQL
psql -U postgres

# Create test database
CREATE DATABASE roombook_test;

# Grant permissions
GRANT ALL PRIVILEGES ON DATABASE roombook_test TO roombook;
```

**Option B: Use Docker (if available)**
```bash
# Run test database container
docker run --name roombook-test-db \
  -e POSTGRES_USER=roombook \
  -e POSTGRES_PASSWORD=roombook_dev_password \
  -e POSTGRES_DB=roombook_test \
  -p 5433:5432 \
  -d postgres:15
```

### 2. Environment Configuration

The test setup automatically uses a test database by modifying the `DATABASE_URL`:
- Development: `postgresql://roombook:roombook_dev_password@localhost:5432/roombook_dev`
- Test: `postgresql://roombook:roombook_dev_password@localhost:5432/roombook_test`

Or set explicitly in `.env.test`:
```
DATABASE_URL=postgresql://roombook:roombook_dev_password@localhost:5432/roombook_test
NODE_ENV=test
```

### 3. Run Migrations on Test Database

```bash
# Set test database URL temporarily
export DATABASE_URL="postgresql://roombook:roombook_dev_password@localhost:5432/roombook_test"

# Run migrations
npm run prisma:migrate

# Seed test data
npm run prisma:seed
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run specific test file
```bash
npm test -- auth.test.ts
npm test -- rooms.test.ts
npm test -- bookings.test.ts
```

### Run with coverage
```bash
npm run test:coverage
```

## Test Coverage

### T031: Authentication Tests (`auth.test.ts`)
- ✅ Successful login with valid credentials
- ✅ Session cookie is set on login
- ✅ Invalid password returns 401
- ✅ Non-existent username returns 401
- ✅ Missing credentials return 400
- ✅ Session persists across requests
- ✅ Logout clears session

**Functional Requirements Tested**: FR-001 (Login), FR-002 (Superuser)

### T032: Room Availability Tests (`rooms.test.ts`)
- ✅ List all rooms without filters
- ✅ Filter rooms by capacity
- ✅ Filter rooms by equipment
- ✅ Filter rooms by availability (no conflicts)
- ✅ Exclude unavailable rooms when booking exists
- ✅ Invalid time range returns 400
- ✅ VIP rooms visible to VIP users
- ✅ Get room by ID
- ✅ 404 for non-existent room

**Functional Requirements Tested**: FR-005 (Browse rooms), FR-006 (Availability check), FR-007 (Filters)

### T033: Booking Conflict Detection (`bookings.test.ts`)
- ✅ Create booking when no conflicts exist
- ✅ Reject exact time overlap (FR-009)
- ✅ Reject partial overlap (start during existing booking)
- ✅ Reject booking containing existing booking
- ✅ Allow back-to-back bookings (no conflict)
- ✅ Provide alternative room suggestions (FR-024)

**Functional Requirements Tested**: FR-009 (Conflict prevention), FR-024 (Alternative rooms)

### T034: Duration Validation (`bookings.test.ts`)
- ✅ Reject booking shorter than 15 minutes (FR-011)
- ✅ Reject booking longer than 8 hours (FR-012)
- ✅ Accept exactly 15 minutes (boundary)
- ✅ Accept exactly 8 hours (boundary)
- ✅ Reject end time before start time
- ✅ Reject zero duration

**Functional Requirements Tested**: FR-010 (Duration), FR-011 (Min 15 min), FR-012 (Max 8 hours)

### Additional Coverage
- ✅ VIP authorization (FR-013)
  - VIP user can book VIP room
  - Standard user cannot book VIP room
- ✅ Basic booking operations
  - Retrieve booking by ID
  - List user bookings
  - Unauthenticated requests rejected

## Test Data Management

### Cleanup Strategy
Each test file manages its own test data:
- `beforeAll`: Create test users, rooms, and login
- `afterAll`: Delete all test data
- `createdBookings` array: Track bookings for cleanup

### Test Isolation
- Tests use unique time slots (different days) to avoid conflicts
- Each test creates its own users/rooms to avoid interference
- Database transactions are NOT used (to test real SERIALIZABLE behavior)

## Troubleshooting

### "Database connection failed"
- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL is correct
- Ensure test database exists: `psql -l | grep roombook_test`

### "Relation does not exist"
- Run migrations on test database: `npm run prisma:migrate`

### "Unique constraint violation"
- Test data from previous run wasn't cleaned up
- Manually clean: `psql roombook_test -c "TRUNCATE users, rooms, bookings CASCADE;"`

### Tests fail intermittently
- Booking time slots might conflict if tests run too fast
- Increase time offsets in tests (e.g., use different days)

### Session/Cookie issues
- Ensure `supertest.agent()` is used for session persistence
- Verify `authCookie` is set after login

## Best Practices

1. **Test Independence**: Each test should be runnable in isolation
2. **Time-based Tests**: Use dates far in the future to avoid conflicts with real data
3. **Cleanup**: Always clean up test data in `afterAll`
4. **Descriptive Names**: Test names should clearly state what they validate
5. **Assertions**: Use specific assertions (`toHaveProperty`, `toBe`) over generic ones

## Success Criteria Validation

- **SC-002**: Zero double-bookings (tested in conflict detection)
- **SC-003**: Availability query < 2s (verified with room filtering)
- **SC-005**: VIP authorization enforced (tested in authorization tests)

## Next Steps

After tests pass:
1. Run tests on CI/CD pipeline
2. Add performance benchmarks (response times)
3. Add load testing for concurrent booking conflicts
4. Expand test coverage for error handling edge cases
