# Frontend E2E Tests

This directory contains end-to-end tests for the Room Booking System frontend using Playwright.

## Test Structure

```
frontend/tests/
├── e2e/
│   └── booking-flow.spec.ts    # Complete booking flow E2E tests (T035)
└── README.md                   # This file
```

## Prerequisites

### 1. Install Playwright Browsers

First time setup:
```bash
npx playwright install
```

This downloads Chromium, Firefox, and WebKit browsers for testing.

### 2. Backend and Database Setup

E2E tests require the backend API and database to be running:

```bash
# Terminal 1: Start backend
cd backend
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Backend should be running on `http://localhost:5000`

### 3. Test Users

Ensure the database is seeded with test users:
- **Standard User**: `user1` / `password123`
- **VIP User**: `superuser` / `000000`

These are created by the `npm run prisma:seed` command.

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run in headed mode (see browser)
```bash
npx playwright test --headed
```

### Run specific test file
```bash
npx playwright test booking-flow
```

### Run with UI mode (interactive debugging)
```bash
npx playwright test --ui
```

### Run in a specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Debug mode
```bash
npx playwright test --debug
```

## Test Coverage

### T035: Complete Booking Flow (`booking-flow.spec.ts`)

#### 1. Complete Flow Under 2 Minutes (SC-001)
Tests the entire user journey with timing validation:
- ✅ Login (< 5s)
- ✅ Select date and time (< 5s)
- ✅ Select room (< 3s)
- ✅ Fill booking form (< 10s)
- ✅ Verify booking success (< 5s)
- ✅ Navigate to "My Bookings" (< 10s)
- ✅ **Total flow time < 2 minutes** (SC-001)

**Success Criteria Tested**: SC-001 (< 2 min booking flow)

#### 2. Booking Conflict Handling
- ✅ Create first booking successfully
- ✅ Detect and reject conflicting booking
- ✅ Display conflict error message
- ✅ Show alternative room suggestions (if available)
- ✅ Hide unavailable rooms from search results

**Functional Requirements Tested**: FR-009 (Conflict prevention), FR-024 (Alternatives)

#### 3. Calendar View
- ✅ Display React Big Calendar component
- ✅ Month/Week/Day view switchers
- ✅ Show existing bookings on calendar
- ✅ Visual representation of events

**Functional Requirements Tested**: FR-017 (Calendar display)

#### 4. VIP Authorization
- ✅ Standard user cannot see VIP rooms (or they're marked as VIP-only)
- ✅ Attempting to book VIP room shows permission error
- ✅ VIP badge displayed on VIP rooms

**Functional Requirements Tested**: FR-013 (VIP authorization)

#### 5. Duration Validation
- ✅ Reject booking < 15 minutes (FR-011)
- ✅ Reject booking > 8 hours (FR-012)
- ✅ Display appropriate error messages

**Functional Requirements Tested**: FR-010, FR-011, FR-012 (Duration limits)

## Test Configuration

Configuration is in `playwright.config.ts`:
- **Base URL**: `http://localhost:3000`
- **Browsers**: Chromium, Firefox, WebKit
- **Screenshots**: On failure
- **Videos**: Retained on failure
- **Traces**: On first retry

### Auto-start Servers

The config includes `webServer` settings to automatically:
1. Start backend on `http://localhost:5000`
2. Start frontend on `http://localhost:3000`

This means tests can run without manually starting servers.

## Test Patterns

### Login Helper
```typescript
async function login(page: Page, username: string, password: string) {
  await page.goto('http://localhost:3000/login');
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/rooms');
}
```

### Date/Time Selection Helper
```typescript
async function selectDateTime(page: Page, hoursFromNow: number, durationHours: number) {
  // Calculates and fills date/time inputs
  // Returns formatted date and time strings
}
```

### Flexible Element Selection
Tests use multiple selectors to handle different UI implementations:
```typescript
// Try multiple selector strategies
const roomCard = page.locator('[data-testid="room-card"], .room-card');
const submitButton = page.locator('button:has-text("Book"), button:has-text("Confirm")');
```

## Debugging

### View Test Report
```bash
npx playwright show-report
```

### Inspect Failed Tests
After a failure, check:
- **Screenshots**: `test-results/*/test-failed-1.png`
- **Videos**: `test-results/*/video.webm`
- **Traces**: Open with `npx playwright show-trace trace.zip`

### Debug Specific Test
```bash
npx playwright test --debug booking-flow.spec.ts:15
```

### Console Logs
Tests include timing logs:
```
Total booking flow time: 45320ms (45.32s)
VIP rooms visible to standard user: 0
```

## Troubleshooting

### "Navigation timeout"
- Backend not running or not seeded
- Frontend dev server not started
- Check URLs: `http://localhost:5000/health`, `http://localhost:3000`

### "Element not found"
- UI implementation differs from test selectors
- Update selectors in test file to match actual component structure
- Use `data-testid` attributes for stable selection

### "Booking not appearing"
- Database not properly seeded
- Previous test data causing conflicts
- Clear test bookings: Run backend tests cleanup

### Tests pass locally but fail in CI
- Use `--project=chromium` in CI (fastest)
- Set `CI=true` environment variable
- Check CI has access to test database

## Best Practices

1. **Stable Selectors**: Use `data-testid` attributes for test-specific selection
2. **Flexible Matchers**: Use regex for text matching (`/confirmed/i`)
3. **Wait Strategies**: Use `waitForSelector` and `waitForURL` over `waitForTimeout`
4. **Cleanup**: Logout after tests to avoid session pollution
5. **Timing Assertions**: Validate performance requirements (SC-001)

## Success Criteria Validation

- ✅ **SC-001**: Single-page booking flow < 2 minutes (explicitly tested with timing)
- ✅ **SC-002**: Conflict prevention (tested via conflict detection test)
- ✅ **SC-005**: VIP authorization (tested via VIP restriction test)

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright
  run: npx playwright install --with-deps chromium

- name: Setup database
  run: |
    cd backend
    npm run prisma:migrate
    npm run prisma:seed

- name: Run E2E tests
  run: npm run test:e2e
  env:
    CI: true
```

## Next Steps

After tests pass:
1. Add tests for User Stories 2-4 (VIP booking, check-in, cancellation)
2. Add mobile viewport tests
3. Add accessibility tests (a11y)
4. Add visual regression tests
5. Integrate with CI/CD pipeline
6. Add performance monitoring (lighthouse scores)
