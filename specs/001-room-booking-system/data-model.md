# Data Model

**Feature**: Room Booking System
**Date**: 2026-05-17
**Database**: PostgreSQL 15+
**ORM**: Prisma 5.x

## Entity Relationship Diagram

```
User (1) ────< organized (M) ────< Booking (M) ────> (1) Room
  │                                    │
  │                                    │
  └──────< participated (M) ───────────┘
  
Booking (1) ────< (M) Notification
```

## Entities

### User

Represents a person using the room booking system.

**Attributes**:
- `id` (UUID, PK): Unique identifier
- `username` (String, UNIQUE, NOT NULL): Login username
- `password_hash` (String, NOT NULL): bcrypt hashed password (work factor 12+)
- `email` (String, UNIQUE, NOT NULL): Email address for notifications
- `full_name` (String, NOT NULL): Display name
- `user_type` (Enum: 'STANDARD' | 'VIP', NOT NULL): Access control role
- `ranking_score` (Integer, DEFAULT 100): User reputation score (decreased by no-shows)
- `created_at` (Timestamp, NOT NULL): Account creation time
- `updated_at` (Timestamp, NOT NULL): Last profile update time

**Indexes**:
- Primary: `id`
- Unique: `username`, `email`
- Index: `user_type` (for VIP user queries)

**Validation Rules**:
- Username: 3-50 characters, alphanumeric + underscore
- Email: Valid email format (RFC 5322)
- Password: Minimum 8 characters (enforced at application layer before hashing)
- Ranking score: Range [-1000, 1000] (prevent overflow)

**Seed Data**:
- VIP user: `username='superuser', password='000000' (hashed), user_type='VIP'` (FR-002)
- Standard users: Created via registration (out of scope for MVP)

---

### Room

Represents a bookable meeting room.

**Attributes**:
- `id` (UUID, PK): Unique identifier
- `name` (String, UNIQUE, NOT NULL): Room display name (e.g., "Conference A", "VIP Boardroom")
- `room_type` (Enum: 'NORMAL' | 'VIP', NOT NULL): Access restriction level
- `capacity` (Integer, NOT NULL): Maximum number of people
- `equipment` (JSON, NOT NULL): Array of available equipment strings
  - Example: `["projector", "whiteboard", "video_conferencing", "phone"]`
- `location` (String, NULLABLE): Building/floor information (optional)
- `is_active` (Boolean, DEFAULT TRUE): Soft delete flag
- `created_at` (Timestamp, NOT NULL): Room creation time
- `updated_at` (Timestamp, NOT NULL): Last modification time

**Indexes**:
- Primary: `id`
- Unique: `name`
- Index: `room_type` (for VIP filtering)
- Index: `capacity` (for availability queries with capacity filter)

**Validation Rules**:
- Name: 1-100 characters, no leading/trailing whitespace
- Capacity: Range [1, 100]
- Equipment: Array of strings, each 1-50 characters

**Seed Data** (Migration):
- 8 normal rooms: capacity range [4, 12], mixed equipment
- 2 VIP rooms: capacity range [8, 20], premium equipment (video conferencing, dual screens)

---

### Booking

Represents a room reservation.

**Attributes**:
- `id` (UUID, PK): Unique identifier
- `room_id` (UUID, FK → Room.id, NOT NULL): Reserved room
- `organizer_id` (UUID, FK → User.id, NOT NULL): User who created booking
- `start_time` (Timestamp, NOT NULL): Booking start (inclusive)
- `end_time` (Timestamp, NOT NULL): Booking end (exclusive)
- `status` (Enum, NOT NULL): Current booking state
  - Values: `REQUESTED`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `REJECTED`, `CANCELLED`, `NO_SHOW`
- `title` (String, NULLABLE): Optional meeting title
- `description` (String, NULLABLE): Optional meeting description
- `rejection_reason` (String, NULLABLE): Error code or message (for REJECTED status)
- `created_at` (Timestamp, NOT NULL): Booking creation time
- `updated_at` (Timestamp, NOT NULL): Last status change time
- `checked_in_at` (Timestamp, NULLABLE): When user checked in (for IN_PROGRESS transition)

**Indexes**:
- Primary: `id`
- Foreign keys: `room_id`, `organizer_id`
- **Composite index (critical for performance)**: `(room_id, start_time, end_time)` for overlap queries
- Index: `organizer_id` (for user's booking list)
- Index: `status` (for filtering active bookings)
- Index: `start_time` (for no-show cron job queries)

**Constraints**:
- `CHECK (end_time > start_time)`: End must be after start
- `CHECK (EXTRACT(EPOCH FROM (end_time - start_time)) >= 900)`: Minimum 15 minutes (FR-010)
- `CHECK (EXTRACT(EPOCH FROM (end_time - start_time)) <= 28800)`: Maximum 8 hours (FR-011)
- **Unique constraint (soft)**: No overlapping bookings for same room where status IN ('CONFIRMED', 'IN_PROGRESS')
  - Enforced via application logic + database transaction isolation (not database constraint due to complexity)

**Validation Rules** (Application Layer):
- Start time: Must be in the future (no past bookings)
- End time: Must be after start time
- Duration: 15 minutes to 8 hours (enforced by CHECK constraints)
- Overlap check: Query existing bookings for same room with overlapping time range and status IN ('CONFIRMED', 'IN_PROGRESS')
- VIP room access: If room.room_type = 'VIP', require organizer.user_type = 'VIP' (FR-013)

**State Machine Transitions** (FR-026, FR-027):

| From State | To State | Trigger | Guard Condition | Side Effects |
|------------|----------|---------|----------------|--------------|
| `REQUESTED` | `CONFIRMED` | System validation | No conflicts + rules pass | Send notifications (FR-015) |
| `REQUESTED` | `REJECTED` | System validation | Conflict or authorization failure | Send rejection + alternatives (FR-016) |
| `CONFIRMED` | `IN_PROGRESS` | User check-in | Within booking time window | Set `checked_in_at` timestamp (FR-018) |
| `CONFIRMED` | `CANCELLED` | User cancellation | N/A | Send cancellation notifications (FR-023) |
| `CONFIRMED` | `NO_SHOW` | Cron timeout | >10 min past start_time without check-in | Reduce organizer ranking by 2, release slot (FR-019, FR-020) |
| `IN_PROGRESS` | `COMPLETED` | Time expiry | Current time > end_time | Mark complete (automatic) |

---

### BookingParticipant (Join Table)

Represents the many-to-many relationship between bookings and participating users.

**Attributes**:
- `id` (UUID, PK): Unique identifier
- `booking_id` (UUID, FK → Booking.id, NOT NULL): Related booking
- `user_id` (UUID, FK → User.id, NOT NULL): Participating user
- `created_at` (Timestamp, NOT NULL): When participant was added

**Indexes**:
- Primary: `id`
- Unique composite: `(booking_id, user_id)` (prevent duplicate participants)
- Foreign keys: `booking_id`, `user_id`
- Index: `booking_id` (for fetching booking participants)
- Index: `user_id` (for finding user's participated bookings)

**Validation Rules**:
- Participant must exist (FK constraint)
- Cannot add participant to CANCELLED, REJECTED, or NO_SHOW bookings
- Organizer automatically added as participant (application logic)

---

### Notification

Represents communication sent to users about booking events.

**Attributes**:
- `id` (UUID, PK): Unique identifier
- `booking_id` (UUID, FK → Booking.id, NULLABLE): Related booking (null for system notifications)
- `recipient_id` (UUID, FK → User.id, NOT NULL): User receiving notification
- `notification_type` (Enum, NOT NULL): Category of notification
  - Values: `BOOKING_CONFIRMED`, `BOOKING_REJECTED`, `BOOKING_CANCELLED`, `NO_SHOW_PENALTY`, `CHECK_IN_REMINDER`
- `subject` (String, NOT NULL): Email subject line
- `message` (Text, NOT NULL): Notification content
- `email_sent` (Boolean, DEFAULT FALSE): Email delivery status
- `email_sent_at` (Timestamp, NULLABLE): When email was successfully sent
- `read` (Boolean, DEFAULT FALSE): In-app read status
- `read_at` (Timestamp, NULLABLE): When user viewed in-app notification
- `created_at` (Timestamp, NOT NULL): Notification creation time

**Indexes**:
- Primary: `id`
- Foreign keys: `booking_id`, `recipient_id`
- Composite index: `(recipient_id, read, created_at DESC)` for user's unread notifications
- Index: `email_sent` (for retry job queries)

**Validation Rules**:
- Subject: 1-200 characters
- Message: 1-10000 characters
- Email retry logic: Up to 3 attempts with exponential backoff

---

## Prisma Schema Snippet

```prisma
// User entity
model User {
  id            String   @id @default(uuid())
  username      String   @unique
  passwordHash  String   @map("password_hash")
  email         String   @unique
  fullName      String   @map("full_name")
  userType      UserType @map("user_type")
  rankingScore  Int      @default(100) @map("ranking_score")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  organizedBookings   Booking[]            @relation("OrganizerBookings")
  participatedBookings BookingParticipant[]
  notifications       Notification[]

  @@index([userType])
  @@map("users")
}

enum UserType {
  STANDARD
  VIP
}

// Room entity
model Room {
  id        String   @id @default(uuid())
  name      String   @unique
  roomType  RoomType @map("room_type")
  capacity  Int
  equipment Json
  location  String?
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  bookings Booking[]

  @@index([roomType])
  @@index([capacity])
  @@map("rooms")
}

enum RoomType {
  NORMAL
  VIP
}

// Booking entity
model Booking {
  id              String        @id @default(uuid())
  roomId          String        @map("room_id")
  organizerId     String        @map("organizer_id")
  startTime       DateTime      @map("start_time")
  endTime         DateTime      @map("end_time")
  status          BookingStatus
  title           String?
  description     String?
  rejectionReason String?       @map("rejection_reason")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")
  checkedInAt     DateTime?     @map("checked_in_at")

  room          Room                  @relation(fields: [roomId], references: [id])
  organizer     User                  @relation("OrganizerBookings", fields: [organizerId], references: [id])
  participants  BookingParticipant[]
  notifications Notification[]

  @@index([roomId, startTime, endTime])
  @@index([organizerId])
  @@index([status])
  @@index([startTime])
  @@map("bookings")
}

enum BookingStatus {
  REQUESTED
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  REJECTED
  CANCELLED
  NO_SHOW
}

// BookingParticipant join table
model BookingParticipant {
  id        String   @id @default(uuid())
  bookingId String   @map("booking_id")
  userId    String   @map("user_id")
  createdAt DateTime @default(now()) @map("created_at")

  booking Booking @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id])

  @@unique([bookingId, userId])
  @@index([bookingId])
  @@index([userId])
  @@map("booking_participants")
}

// Notification entity
model Notification {
  id               String           @id @default(uuid())
  bookingId        String?          @map("booking_id")
  recipientId      String           @map("recipient_id")
  notificationType NotificationType @map("notification_type")
  subject          String
  message          String           @db.Text
  emailSent        Boolean          @default(false) @map("email_sent")
  emailSentAt      DateTime?        @map("email_sent_at")
  read             Boolean          @default(false)
  readAt           DateTime?        @map("read_at")
  createdAt        DateTime         @default(now()) @map("created_at")

  booking   Booking? @relation(fields: [bookingId], references: [id])
  recipient User     @relation(fields: [recipientId], references: [id])

  @@index([recipientId, read, createdAt(sort: Desc)])
  @@index([emailSent])
  @@map("notifications")
}

enum NotificationType {
  BOOKING_CONFIRMED
  BOOKING_REJECTED
  BOOKING_CANCELLED
  NO_SHOW_PENALTY
  CHECK_IN_REMINDER
}
```

## Query Patterns

### Conflict Detection (Critical Path)

```sql
-- Check for overlapping bookings (FR-009, FR-024)
SELECT id FROM bookings
WHERE room_id = $1
  AND status IN ('CONFIRMED', 'IN_PROGRESS')
  AND (
    (start_time < $3 AND end_time > $2) OR  -- Overlaps existing booking
    (start_time >= $2 AND start_time < $3)  -- Starts during requested time
  )
LIMIT 1;
-- If result exists, booking conflicts (reject)
-- Uses index: bookings(room_id, start_time, end_time)
```

### Availability Query (SC-003: <2s)

```sql
-- Find available rooms for date/time with capacity filter
SELECT r.* FROM rooms r
WHERE r.room_type = 'NORMAL'  -- or 'VIP' for VIP users
  AND r.capacity >= $1
  AND r.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.room_id = r.id
      AND b.status IN ('CONFIRMED', 'IN_PROGRESS')
      AND b.start_time < $3
      AND b.end_time > $2
  );
-- Uses indexes: rooms(room_type, capacity), bookings(room_id, start_time, end_time)
```

### No-Show Detection (Cron Job - FR-019)

```sql
-- Find bookings that need no-show marking (runs every 1 minute)
SELECT id, organizer_id FROM bookings
WHERE status = 'CONFIRMED'
  AND start_time < NOW() - INTERVAL '10 minutes'
  AND checked_in_at IS NULL;
-- Uses index: bookings(status, start_time)
-- Update: SET status='NO_SHOW', UPDATE users SET ranking_score = ranking_score - 2
```

## Migration Strategy

1. **Initial schema** (v1): All tables, indexes, constraints
2. **Seed data** (v1): 10 rooms (8 normal, 2 VIP), superuser account
3. **Sample data** (optional dev): 5 standard users, 20 sample bookings

## Data Integrity Rules

1. **Referential Integrity**: All foreign keys have `ON DELETE` behavior
   - `Booking.roomId` → `ON DELETE RESTRICT` (cannot delete room with bookings)
   - `Booking.organizerId` → `ON DELETE RESTRICT` (cannot delete user with bookings)
   - `BookingParticipant` → `ON DELETE CASCADE` (remove participants when booking deleted)
   - `Notification.bookingId` → `ON DELETE SET NULL` (keep notifications for audit)

2. **Transaction Boundaries**:
   - Booking creation: Single transaction (insert booking + participants + notifications)
   - Status transitions: Single transaction (update booking + create notification + update user ranking if applicable)
   - Conflict check + insert: `SERIALIZABLE` isolation level to prevent race conditions

3. **Audit Trail**: All entities have `created_at` and `updated_at` (where applicable) for change tracking

## Performance Considerations

- **Index coverage**: 90% of queries use composite index on bookings(room_id, start_time, end_time)
- **Connection pooling**: Prisma default (10 connections), increase to 20 for 50+ concurrent users
- **Query timeout**: 5 seconds max for availability queries (fail fast)
- **Caching strategy** (optional Phase 2): Redis cache for room list (TTL 5 minutes), invalidate on room updates
