# API Contracts

**Feature**: Room Booking System
**Date**: 2026-05-17
**API Style**: REST
**Base URL**: `/api/v1`
**Authentication**: Session-based (Express Session + Passport.js)

## Authentication Endpoints

### POST /auth/login

Authenticate user and create session.

**Request**:
```json
{
  "username": "string (3-50 chars)",
  "password": "string (min 8 chars)"
}
```

**Response 200** (Success):
```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "fullName": "string",
    "userType": "STANDARD" | "VIP",
    "rankingScore": "integer"
  },
  "message": "Login successful"
}
```

**Response 401** (Invalid credentials):
```json
{
  "error": "INVALID_CREDENTIALS",
  "message": "Invalid username or password"
}
```

**Response 429** (Rate limit):
```json
{
  "error": "TOO_MANY_ATTEMPTS",
  "message": "Too many login attempts. Try again in 15 minutes."
}
```

---

### POST /auth/logout

Terminate user session.

**Request**: Empty body

**Response 200**:
```json
{
  "message": "Logout successful"
}
```

---

### GET /auth/me

Get current user profile (requires authentication).

**Response 200**:
```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "fullName": "string",
    "userType": "STANDARD" | "VIP",
    "rankingScore": "integer",
    "createdAt": "ISO 8601 timestamp",
    "updatedAt": "ISO 8601 timestamp"
  }
}
```

**Response 401** (Not authenticated):
```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

---

## Room Endpoints

### GET /rooms

List available rooms (optionally filtered by availability).

**Query Parameters**:
- `startTime` (optional): ISO 8601 timestamp - filter rooms available at this time
- `endTime` (optional): ISO 8601 timestamp - filter rooms available until this time
- `capacity` (optional): Integer - filter rooms with at least this capacity
- `equipment` (optional): Comma-separated strings - filter rooms with specified equipment

**Response 200**:
```json
{
  "rooms": [
    {
      "id": "uuid",
      "name": "string",
      "roomType": "NORMAL" | "VIP",
      "capacity": "integer",
      "equipment": ["string"],
      "location": "string | null",
      "available": "boolean (if startTime/endTime provided)"
    }
  ],
  "total": "integer"
}
```

**Example**:
```
GET /rooms?startTime=2026-05-20T14:00:00Z&endTime=2026-05-20T16:00:00Z&capacity=6
```

**Response 400** (Invalid parameters):
```json
{
  "error": "INVALID_PARAMETERS",
  "message": "endTime must be after startTime"
}
```

---

### GET /rooms/:id

Get room details by ID.

**Response 200**:
```json
{
  "room": {
    "id": "uuid",
    "name": "string",
    "roomType": "NORMAL" | "VIP",
    "capacity": "integer",
    "equipment": ["string"],
    "location": "string | null",
    "createdAt": "ISO 8601 timestamp",
    "updatedAt": "ISO 8601 timestamp"
  }
}
```

**Response 404** (Room not found):
```json
{
  "error": "ROOM_NOT_FOUND",
  "message": "Room with ID {id} does not exist"
}
```

---

## Booking Endpoints

### POST /bookings

Create a new booking (requires authentication).

**Request**:
```json
{
  "roomId": "uuid",
  "startTime": "ISO 8601 timestamp",
  "endTime": "ISO 8601 timestamp",
  "title": "string (optional, max 200 chars)",
  "description": "string (optional, max 1000 chars)",
  "participantIds": ["uuid"] (optional, array of user IDs)
}
```

**Response 201** (Booking confirmed):
```json
{
  "booking": {
    "id": "uuid",
    "roomId": "uuid",
    "organizerId": "uuid",
    "startTime": "ISO 8601 timestamp",
    "endTime": "ISO 8601 timestamp",
    "status": "CONFIRMED",
    "title": "string | null",
    "description": "string | null",
    "createdAt": "ISO 8601 timestamp",
    "updatedAt": "ISO 8601 timestamp",
    "room": {
      "id": "uuid",
      "name": "string",
      "roomType": "NORMAL" | "VIP"
    },
    "organizer": {
      "id": "uuid",
      "fullName": "string"
    },
    "participants": [
      {
        "id": "uuid",
        "fullName": "string"
      }
    ]
  },
  "message": "Booking confirmed. Notifications sent to all participants."
}
```

**Response 400** (Validation error):
```json
{
  "error": "INVALID_DURATION",
  "message": "Booking duration must be between 15 minutes and 8 hours",
  "details": {
    "minDuration": "15 minutes",
    "maxDuration": "8 hours",
    "requestedDuration": "string"
  }
}
```

**Response 403** (Authorization error - FR-013):
```json
{
  "error": "INSUFFICIENT_CLEARANCE",
  "message": "VIP rooms require superuser clearance",
  "details": {
    "roomType": "VIP",
    "userType": "STANDARD"
  }
}
```

**Response 409** (Conflict - EC-001):
```json
{
  "error": "CONFLICT",
  "message": "Room is not available during requested time",
  "details": {
    "conflictingBooking": {
      "id": "uuid",
      "startTime": "ISO 8601 timestamp",
      "endTime": "ISO 8601 timestamp"
    },
    "alternatives": [
      {
        "roomId": "uuid",
        "roomName": "string",
        "availableSlots": [
          {
            "startTime": "ISO 8601 timestamp",
            "endTime": "ISO 8601 timestamp"
          }
        ]
      }
    ]
  }
}
```

---

### GET /bookings

List bookings for authenticated user (either as organizer or participant).

**Query Parameters**:
- `status` (optional): Comma-separated statuses - filter by booking status
- `startDate` (optional): ISO 8601 date - filter bookings starting after this date
- `endDate` (optional): ISO 8601 date - filter bookings starting before this date
- `page` (optional): Integer (default 1) - pagination page number
- `limit` (optional): Integer (default 20, max 100) - results per page

**Response 200**:
```json
{
  "bookings": [
    {
      "id": "uuid",
      "roomId": "uuid",
      "organizerId": "uuid",
      "startTime": "ISO 8601 timestamp",
      "endTime": "ISO 8601 timestamp",
      "status": "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW",
      "title": "string | null",
      "description": "string | null",
      "createdAt": "ISO 8601 timestamp",
      "room": {
        "id": "uuid",
        "name": "string",
        "roomType": "NORMAL" | "VIP"
      },
      "organizer": {
        "id": "uuid",
        "fullName": "string"
      },
      "participantCount": "integer"
    }
  ],
  "pagination": {
    "page": "integer",
    "limit": "integer",
    "total": "integer",
    "totalPages": "integer"
  }
}
```

---

### GET /bookings/:id

Get booking details by ID (requires authentication).

**Response 200**:
```json
{
  "booking": {
    "id": "uuid",
    "roomId": "uuid",
    "organizerId": "uuid",
    "startTime": "ISO 8601 timestamp",
    "endTime": "ISO 8601 timestamp",
    "status": "string",
    "title": "string | null",
    "description": "string | null",
    "createdAt": "ISO 8601 timestamp",
    "updatedAt": "ISO 8601 timestamp",
    "checkedInAt": "ISO 8601 timestamp | null",
    "room": {
      "id": "uuid",
      "name": "string",
      "roomType": "NORMAL" | "VIP",
      "capacity": "integer",
      "equipment": ["string"],
      "location": "string | null"
    },
    "organizer": {
      "id": "uuid",
      "fullName": "string",
      "email": "string"
    },
    "participants": [
      {
        "id": "uuid",
        "fullName": "string",
        "email": "string"
      }
    ]
  }
}
```

**Response 404** (Booking not found):
```json
{
  "error": "BOOKING_NOT_FOUND",
  "message": "Booking with ID {id} does not exist"
}
```

**Response 403** (Not authorized to view):
```json
{
  "error": "FORBIDDEN",
  "message": "You are not authorized to view this booking"
}
```

---

### POST /bookings/:id/check-in

Check in to a confirmed booking (FR-018).

**Request**: Empty body

**Response 200**:
```json
{
  "booking": {
    "id": "uuid",
    "status": "IN_PROGRESS",
    "checkedInAt": "ISO 8601 timestamp",
    "updatedAt": "ISO 8601 timestamp"
  },
  "message": "Checked in successfully"
}
```

**Response 400** (Invalid state):
```json
{
  "error": "INVALID_STATE_TRANSITION",
  "message": "Cannot check in to booking with status {status}. Must be CONFIRMED.",
  "details": {
    "currentStatus": "string",
    "requiredStatus": "CONFIRMED"
  }
}
```

**Response 409** (Too early or too late):
```json
{
  "error": "CHECK_IN_WINDOW_CLOSED",
  "message": "Check-in window has expired (more than 10 minutes past start time)",
  "details": {
    "startTime": "ISO 8601 timestamp",
    "currentTime": "ISO 8601 timestamp",
    "graceMinutes": 10
  }
}
```

---

### DELETE /bookings/:id

Cancel a confirmed booking (FR-021).

**Request**: Empty body

**Response 200**:
```json
{
  "booking": {
    "id": "uuid",
    "status": "CANCELLED",
    "updatedAt": "ISO 8601 timestamp"
  },
  "message": "Booking cancelled. Notifications sent to all participants."
}
```

**Response 400** (Invalid state):
```json
{
  "error": "INVALID_STATE_TRANSITION",
  "message": "Cannot cancel booking with status {status}. Must be CONFIRMED.",
  "details": {
    "currentStatus": "string",
    "allowedStatuses": ["CONFIRMED"]
  }
}
```

**Response 403** (Not organizer):
```json
{
  "error": "FORBIDDEN",
  "message": "Only the booking organizer can cancel this booking"
}
```

---

## Notification Endpoints

### GET /notifications

Get notifications for authenticated user.

**Query Parameters**:
- `unreadOnly` (optional): Boolean - filter to unread notifications only
- `page` (optional): Integer (default 1)
- `limit` (optional): Integer (default 20, max 100)

**Response 200**:
```json
{
  "notifications": [
    {
      "id": "uuid",
      "bookingId": "uuid | null",
      "notificationType": "BOOKING_CONFIRMED" | "BOOKING_REJECTED" | "BOOKING_CANCELLED" | "NO_SHOW_PENALTY" | "CHECK_IN_REMINDER",
      "subject": "string",
      "message": "string",
      "read": "boolean",
      "readAt": "ISO 8601 timestamp | null",
      "createdAt": "ISO 8601 timestamp"
    }
  ],
  "pagination": {
    "page": "integer",
    "limit": "integer",
    "total": "integer",
    "totalPages": "integer"
  },
  "unreadCount": "integer"
}
```

---

### PATCH /notifications/:id/read

Mark notification as read.

**Request**: Empty body

**Response 200**:
```json
{
  "notification": {
    "id": "uuid",
    "read": true,
    "readAt": "ISO 8601 timestamp"
  },
  "message": "Notification marked as read"
}
```

---

## Calendar Endpoint

### GET /calendar

Get calendar view of bookings for specified date range.

**Query Parameters**:
- `startDate`: ISO 8601 date (required) - start of calendar range
- `endDate`: ISO 8601 date (required) - end of calendar range
- `roomId` (optional): UUID - filter to specific room

**Response 200**:
```json
{
  "events": [
    {
      "id": "uuid (booking ID)",
      "roomId": "uuid",
      "roomName": "string",
      "organizerName": "string",
      "title": "string",
      "start": "ISO 8601 timestamp",
      "end": "ISO 8601 timestamp",
      "status": "string",
      "participantCount": "integer",
      "isOrganizer": "boolean",
      "isParticipant": "boolean"
    }
  ],
  "dateRange": {
    "start": "ISO 8601 date",
    "end": "ISO 8601 date"
  }
}
```

**Response 400** (Invalid date range):
```json
{
  "error": "INVALID_DATE_RANGE",
  "message": "endDate must be after startDate"
}
```

---

## Error Response Format

All error responses follow this structure:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": { (optional additional context) }
}
```

**Common Error Codes**:
- `UNAUTHORIZED`: Not authenticated (401)
- `FORBIDDEN`: Authenticated but not authorized (403)
- `NOT_FOUND`: Resource doesn't exist (404)
- `INVALID_PARAMETERS`: Validation error (400)
- `CONFLICT`: Resource conflict (409)
- `INTERNAL_ERROR`: Server error (500)

---

## Rate Limiting

- **Login endpoint**: 5 attempts per 15 minutes per IP address
- **Booking creation**: 10 requests per minute per user
- **All other endpoints**: 100 requests per minute per user

**Rate Limit Response (429)**:
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests",
  "retryAfter": "integer (seconds)"
}
```

---

## CORS Policy

- **Allowed origins**: Configured per environment (development: `http://localhost:3000`, production: specific domain)
- **Allowed methods**: GET, POST, PATCH, DELETE, OPTIONS
- **Allowed headers**: Content-Type, Authorization, X-CSRF-Token
- **Credentials**: Allowed (for session cookies)

---

## Security Headers

All responses include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HTTPS only)

---

## Versioning

API versioned via URL path (`/api/v1`). Future breaking changes will increment version (`/api/v2`). Non-breaking changes (new optional fields, new endpoints) do not require version increment.
