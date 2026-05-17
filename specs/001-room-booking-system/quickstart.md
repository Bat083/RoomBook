# Quick Start Guide: Room Booking System

**Feature**: Room Booking System
**Date**: 2026-05-17
**Target Audience**: Developers implementing this feature

## Overview

This guide provides a fast path to understanding and implementing the Room Booking System. It covers:
1. Project setup (5 minutes)
2. Understanding the architecture (10 minutes)
3. Key implementation patterns (15 minutes)
4. Testing strategy (10 minutes)

Total estimated reading time: **40 minutes**

---

## 1. Project Setup

### Prerequisites

- **Node.js**: 20 LTS or higher
- **PostgreSQL**: 15 or higher
- **npm** or **yarn**: Latest version
- **Git**: For version control

### Initial Setup (5 minutes)

```bash
# Clone repository (if not already)
git clone <repository-url>
cd RoomBook

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your database credentials:
# DATABASE_URL="postgresql://user:password@localhost:5432/roombookdb"
# SESSION_SECRET="generate-a-random-secret-here"
# SMTP_HOST="smtp.gmail.com"  # or your email provider
# SMTP_PORT=587
# SMTP_USER="your-email@example.com"
# SMTP_PASS="your-email-password"

# Run database migrations
npx prisma migrate dev

# Seed database with initial data (10 rooms, superuser)
npx prisma db seed

# Start development server
npm run dev
# Backend: http://localhost:3001
# Frontend: http://localhost:3000
```

### Verify Setup

1. Navigate to `http://localhost:3000`
2. Login with superuser credentials:
   - Username: `superuser`
   - Password: `000000`
3. You should see the calendar view with 10 available rooms

---

## 2. Architecture Overview

### Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18.2 + TypeScript | UI components, calendar view |
| **Backend** | Node.js 20 + Express 4.18 | REST API, business logic |
| **Database** | PostgreSQL 15 | Data persistence, transactions |
| **ORM** | Prisma 5.x | Type-safe queries, migrations |
| **Auth** | Passport.js + Express Session | Authentication, authorization |
| **Testing** | Jest + React Testing Library + Supertest | Unit, integration, E2E |

### Project Structure

```
RoomBook/
├── backend/                   # API server
│   ├── src/
│   │   ├── controllers/       # HTTP request handlers
│   │   ├── services/          # Business logic
│   │   ├── repositories/      # Data access (Prisma)
│   │   ├── middleware/        # Auth, error handling
│   │   ├── utils/             # Helpers
│   │   └── server.ts          # Express app entry point
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   ├── migrations/        # SQL migration files
│   │   └── seed.ts            # Initial data
│   └── tests/                 # Backend tests
│       ├── integration/       # API endpoint tests
│       └── unit/              # Service/util tests
├── frontend/                  # React app
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page-level components
│   │   ├── services/          # API client, auth
│   │   ├── hooks/             # Custom React hooks
│   │   ├── types/             # TypeScript types
│   │   └── App.tsx            # React app entry point
│   └── tests/                 # Frontend tests
│       └── components/        # Component tests
└── specs/                     # Feature documentation
    └── 001-room-booking-system/
        ├── spec.md            # Requirements
        ├── plan.md            # This file
        ├── research.md        # Tech decisions
        ├── data-model.md      # Database schema
        └── contracts/         # API documentation
```

### Request Flow

```
User Action (Browser)
    ↓
React Component (Frontend)
    ↓ HTTP Request (fetch/axios)
Express Controller (Backend)
    ↓
Service Layer (Business Logic)
    ↓ Validation, Authorization
Prisma Repository (Data Access)
    ↓ SQL Query
PostgreSQL Database
    ↑ Results
Prisma Repository
    ↑ Transformed Data
Service Layer
    ↑ Response DTO
Express Controller
    ↑ HTTP Response (JSON)
React Component (Frontend)
    ↓
UI Update (Re-render)
```

---

## 3. Key Implementation Patterns

### Pattern 1: Booking Creation with Conflict Detection

**Location**: `backend/src/services/bookingService.ts`

**Key Concept**: Use database transaction + isolation level to prevent double-bookings (EC-001).

```typescript
async function createBooking(data: CreateBookingDTO): Promise<Booking> {
  return await prisma.$transaction(async (tx) => {
    // 1. Authorization check (FR-013)
    const room = await tx.room.findUnique({ where: { id: data.roomId } });
    if (room.roomType === 'VIP' && user.userType !== 'VIP') {
      throw new AuthorizationError('INSUFFICIENT_CLEARANCE');
    }

    // 2. Conflict detection (FR-009, FR-024)
    const conflicts = await tx.booking.findFirst({
      where: {
        roomId: data.roomId,
        status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
        OR: [
          {
            startTime: { lt: data.endTime },
            endTime: { gt: data.startTime },
          },
        ],
      },
    });

    if (conflicts) {
      // 3. Find alternatives (FR-016)
      const alternatives = await findAlternativeSlots(tx, data);
      throw new ConflictError('CONFLICT', alternatives);
    }

    // 4. Create booking + participants (FR-014)
    const booking = await tx.booking.create({
      data: {
        ...data,
        status: 'CONFIRMED',
        participants: {
          create: data.participantIds.map(id => ({ userId: id })),
        },
      },
      include: { room: true, organizer: true, participants: true },
    });

    // 5. Send notifications (FR-015)
    await notificationService.sendBookingConfirmed(booking);

    return booking;
  }, {
    isolationLevel: 'Serializable', // Prevent phantom reads
  });
}
```

**Why This Works**:
- `Serializable` isolation prevents race conditions
- Single transaction ensures atomicity (all-or-nothing)
- Conflict check uses indexed query (`room_id, start_time, end_time`)

---

### Pattern 2: State Machine Transitions

**Location**: `backend/src/services/bookingService.ts`

**Key Concept**: Centralize state transition logic with validation.

```typescript
// State transition map (FR-026)
const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  REQUESTED: ['CONFIRMED', 'REJECTED'],
  CONFIRMED: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED'],
  // Terminal states (no transitions)
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

async function transitionBookingState(
  bookingId: string,
  newStatus: BookingStatus,
  context: TransitionContext
): Promise<Booking> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

  // Validate transition
  if (!VALID_TRANSITIONS[booking.status].includes(newStatus)) {
    throw new ValidationError(
      `Invalid state transition: ${booking.status} → ${newStatus}`
    );
  }

  // Execute side effects based on transition
  const updatedBooking = await prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: newStatus,
        ...(newStatus === 'IN_PROGRESS' && { checkedInAt: new Date() }),
      },
    });

    // Side effects (FR-020, FR-023)
    if (newStatus === 'NO_SHOW') {
      await tx.user.update({
        where: { id: booking.organizerId },
        data: { rankingScore: { decrement: 2 } },
      });
      await notificationService.sendNoShowPenalty(booking);
    } else if (newStatus === 'CANCELLED') {
      await notificationService.sendBookingCancelled(booking);
    }

    return updated;
  });

  return updatedBooking;
}
```

---

### Pattern 3: Authorization Middleware

**Location**: `backend/src/middleware/auth.ts`

**Key Concept**: Enforce access control at middleware layer (Constitution III).

```typescript
// Require authentication
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }
  next();
}

// Require VIP user type
export function requireVIP(req: Request, res: Response, next: NextFunction) {
  if (req.user.userType !== 'VIP') {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'VIP access required',
    });
  }
  next();
}

// Require booking organizer
export async function requireBookingOwner(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
  });

  if (!booking || booking.organizerId !== req.user.id) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Only the booking organizer can perform this action',
    });
  }

  req.booking = booking; // Attach to request for controller use
  next();
}
```

**Usage**:
```typescript
// In routes
router.post('/bookings', requireAuth, bookingController.create);
router.delete('/bookings/:id', requireAuth, requireBookingOwner, bookingController.cancel);
```

---

### Pattern 4: No-Show Detection Cron Job

**Location**: `backend/src/jobs/noShowDetection.ts`

**Key Concept**: Periodic check for overdue bookings without check-in (FR-019, FR-020).

```typescript
import cron from 'node-cron';

// Run every 1 minute
cron.schedule('* * * * *', async () => {
  const overdueBookings = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      startTime: {
        lt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      },
      checkedInAt: null,
    },
    include: { organizer: true },
  });

  for (const booking of overdueBookings) {
    try {
      // Transition to NO_SHOW with side effects
      await bookingService.transitionBookingState(
        booking.id,
        'NO_SHOW',
        { triggeredBy: 'cron' }
      );
      
      console.log(`Marked booking ${booking.id} as NO_SHOW`);
    } catch (error) {
      console.error(`Failed to mark booking ${booking.id} as NO_SHOW:`, error);
    }
  }
});
```

**Important**: Handle power outages (EC-002) by checking external monitor API on startup and extending grace periods.

---

## 4. Testing Strategy

### Test Pyramid

```
       E2E Tests (5%)
      /           \
     /  Integration (25%)
    /       |             \
   /     Unit (70%)        \
  /________________________\
```

### Unit Tests (70%)

**Focus**: Business logic, utilities, validation

**Example** (`backend/tests/unit/bookingService.test.ts`):
```typescript
describe('BookingService', () => {
  describe('createBooking', () => {
    it('should create booking for standard user with normal room', async () => {
      const booking = await bookingService.createBooking({
        roomId: 'normal-room-uuid',
        organizerId: 'standard-user-uuid',
        startTime: new Date('2026-05-20T14:00:00Z'),
        endTime: new Date('2026-05-20T15:00:00Z'),
      });

      expect(booking.status).toBe('CONFIRMED');
      expect(notificationService.sendBookingConfirmed).toHaveBeenCalled();
    });

    it('should reject VIP room booking for standard user (FR-013)', async () => {
      await expect(
        bookingService.createBooking({
          roomId: 'vip-room-uuid',
          organizerId: 'standard-user-uuid',
          ...validTimeRange,
        })
      ).rejects.toThrow('INSUFFICIENT_CLEARANCE');
    });

    it('should reject booking with duration < 15 minutes (FR-010)', async () => {
      await expect(
        bookingService.createBooking({
          roomId: 'normal-room-uuid',
          startTime: new Date('2026-05-20T14:00:00Z'),
          endTime: new Date('2026-05-20T14:10:00Z'), // 10 minutes
        })
      ).rejects.toThrow('INVALID_DURATION');
    });
  });
});
```

---

### Integration Tests (25%)

**Focus**: API endpoints, database interactions

**Example** (`backend/tests/integration/bookings.test.ts`):
```typescript
describe('POST /api/v1/bookings', () => {
  it('should create booking and prevent double-booking (EC-001)', async () => {
    const bookingData = {
      roomId: testRoom.id,
      startTime: '2026-05-20T14:00:00Z',
      endTime: '2026-05-20T15:00:00Z',
    };

    // First booking succeeds
    const res1 = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', userSession)
      .send(bookingData)
      .expect(201);

    expect(res1.body.booking.status).toBe('CONFIRMED');

    // Second booking conflicts
    const res2 = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', anotherUserSession)
      .send(bookingData)
      .expect(409);

    expect(res2.body.error).toBe('CONFLICT');
    expect(res2.body.details.alternatives).toBeDefined();
  });
});
```

---

### E2E Tests (5%)

**Focus**: Critical user journeys (P1 user stories)

**Example** (`frontend/tests/e2e/standardUserBooking.spec.ts` - Playwright):
```typescript
test('Standard user can book normal room (P1)', async ({ page }) => {
  // Login
  await page.goto('http://localhost:3000/login');
  await page.fill('[name="username"]', 'testuser');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Navigate to booking page
  await page.click('text=Book a Room');

  // Select date, time, room
  await page.fill('[name="date"]', '2026-05-20');
  await page.fill('[name="startTime"]', '14:00');
  await page.fill('[name="endTime"]', '15:00');
  await page.selectOption('[name="room"]', { label: 'Conference Room A' });

  // Submit booking
  await page.click('button:has-text("Confirm Booking")');

  // Verify confirmation
  await expect(page.locator('text=Booking confirmed')).toBeVisible();
  await expect(page.locator('[data-testid="booking-status"]')).toHaveText('CONFIRMED');
});
```

---

## 5. Constitution Compliance Checklist

Before merging, verify:

- [ ] **Principle I**: Booking flow is single-page, all options visible
- [ ] **Principle II**: Database constraints prevent double-bookings, audit trail present
- [ ] **Principle III**: VIP room access checked at both controller and service layers
- [ ] **Principle IV**: Load tested with 50 concurrent booking requests (no errors)
- [ ] **Principle V**: Integration tests cover P1 user story, authorization tests for VIP access

---

## 6. Next Steps

1. **Read the full spec**: `specs/001-room-booking-system/spec.md` for all requirements
2. **Review data model**: `specs/001-room-booking-system/data-model.md` for database schema
3. **Check API contracts**: `specs/001-room-booking-system/contracts/api-endpoints.md` for endpoint specs
4. **Run tests**: `npm test` to verify current implementation
5. **Start implementing**: Pick a task from `specs/001-room-booking-system/tasks.md` (generated by `/speckit-tasks`)

---

## 7. Common Gotchas

### Gotcha 1: Timezone Handling

**Problem**: Booking times stored without timezone awareness.

**Solution**: Always store times in UTC, convert to user timezone on display.

```typescript
// Backend: Store in UTC
const booking = await prisma.booking.create({
  data: {
    startTime: new Date(req.body.startTime), // ISO 8601 with 'Z'
    endTime: new Date(req.body.endTime),
  },
});

// Frontend: Display in user timezone
import { formatInTimeZone } from 'date-fns-tz';

const displayTime = formatInTimeZone(
  booking.startTime,
  'America/New_York', // User's timezone
  'MMM dd, yyyy HH:mm'
);
```

---

### Gotcha 2: Optimistic UI Updates

**Problem**: Calendar doesn't update immediately after booking creation.

**Solution**: Use React Query's optimistic updates.

```typescript
const createBookingMutation = useMutation({
  mutationFn: bookingApi.create,
  onMutate: async (newBooking) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey: ['bookings'] });

    // Snapshot previous value
    const previousBookings = queryClient.getQueryData(['bookings']);

    // Optimistically update
    queryClient.setQueryData(['bookings'], (old) => [...old, newBooking]);

    return { previousBookings };
  },
  onError: (err, newBooking, context) => {
    // Rollback on error
    queryClient.setQueryData(['bookings'], context.previousBookings);
  },
  onSettled: () => {
    // Refetch after mutation
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
  },
});
```

---

### Gotcha 3: Email Notification Failures

**Problem**: SMTP errors block booking creation.

**Solution**: Decouple notification sending using async queue or fire-and-forget.

```typescript
async function createBooking(data: CreateBookingDTO): Promise<Booking> {
  const booking = await prisma.booking.create({ data });

  // Don't await notification sending
  notificationService.sendBookingConfirmed(booking).catch((error) => {
    console.error('Failed to send booking confirmation email:', error);
    // Create in-app notification as fallback
    prisma.notification.create({
      data: {
        bookingId: booking.id,
        recipientId: booking.organizerId,
        type: 'BOOKING_CONFIRMED',
        emailSent: false,
      },
    });
  });

  return booking; // Don't block on email delivery
}
```

---

## 8. Useful Commands

```bash
# Database
npm run db:migrate     # Run pending migrations
npm run db:seed        # Seed initial data
npm run db:studio      # Open Prisma Studio (GUI)
npm run db:reset       # Reset database (caution!)

# Development
npm run dev            # Start dev servers (frontend + backend)
npm run dev:backend    # Backend only
npm run dev:frontend   # Frontend only

# Testing
npm test               # Run all tests
npm run test:unit      # Unit tests only
npm run test:integration  # Integration tests only
npm run test:e2e       # End-to-end tests (requires running servers)
npm run test:coverage  # Generate coverage report

# Linting & Formatting
npm run lint           # ESLint check
npm run lint:fix       # Auto-fix lint issues
npm run format         # Prettier format

# Build
npm run build          # Build for production
npm run build:backend  # Backend only
npm run build:frontend # Frontend only

# Production
npm run start          # Start production server (requires build first)
```

---

## 9. Support & Resources

- **Spec**: `specs/001-room-booking-system/spec.md` - Full requirements
- **Data Model**: `specs/001-room-booking-system/data-model.md` - Database schema
- **API Docs**: `specs/001-room-booking-system/contracts/api-endpoints.md` - REST API reference
- **Architecture**: `specs/001-room-booking-system/research.md` - Tech decisions
- **Tasks**: `specs/001-room-booking-system/tasks.md` - Implementation checklist (generated by `/speckit-tasks`)

For questions, contact the development team or refer to the constitution: `.specify/memory/constitution.md`
