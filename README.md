# Room Booking System

A full-stack TypeScript web application for managing room bookings with support for standard and VIP users.

## Features

- 🔐 User authentication (standard and VIP users)
- 📅 Interactive calendar interface for room booking
- 🏢 Room availability filtering by capacity and equipment
- ⏰ Booking duration validation (15 min - 8 hours)
- 🚫 Concurrent booking conflict prevention
- 📧 Email notifications for booking events
- ✅ Check-in system with no-show detection
- 📊 User ranking system

## Tech Stack

### Backend
- Node.js 20 LTS + TypeScript 5.4+
- Express 4.18+ (REST API)
- Prisma 5.x (ORM)
- PostgreSQL 15+
- Passport.js 0.7+ (Authentication)
- Nodemailer 6.9+ (Email notifications)
- Node-cron 3.0+ (Scheduled tasks)

### Frontend
- React 18.2 + TypeScript 5.4+
- Vite (Build tool)
- React Big Calendar (UI)
- React Query (State management)
- date-fns (Date utilities)

## Getting Started

### Prerequisites

- Node.js 20 LTS or later
- PostgreSQL 15 or later
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd RoomBook
   ```

2. **Start PostgreSQL database**
   ```bash
   docker-compose up -d
   ```

3. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   
   # Run database migrations
   npm run prisma:migrate
   
   # Seed database (creates superuser and rooms)
   npm run prisma:seed
   ```

4. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   ```

### Running the Application

**Development mode:**

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Backend runs on: http://localhost:5000
Frontend runs on: http://localhost:3000

### Default Credentials

**VIP Superuser:**
- Username: `superuser`
- Password: `000000`

**Standard Users:**
- Username: `user1` to `user5`
- Password: `password123`

## Project Structure

```
RoomBook/
├── backend/              # Node.js/Express API server
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── services/     # Business logic
│   │   ├── repositories/ # Database access
│   │   ├── middleware/   # Express middleware
│   │   ├── config/       # Configuration files
│   │   ├── routes/       # API routes
│   │   ├── types/        # TypeScript types
│   │   └── app.ts        # Express app setup
│   ├── prisma/           # Database schema & migrations
│   └── tests/            # Backend tests
├── frontend/             # React 18 SPA
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API client
│   │   ├── hooks/        # Custom React hooks
│   │   ├── contexts/     # React contexts
│   │   └── types/        # TypeScript types
│   └── tests/            # Frontend tests
├── specs/                # Feature specifications
└── docs/                 # Documentation
```

## Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests
cd frontend
npm run test:e2e
```

## Documentation

- [Feature Specification](specs/001-room-booking-system/spec.md)
- [Implementation Plan](specs/001-room-booking-system/plan.md)
- [API Contracts](specs/001-room-booking-system/contracts/api-endpoints.md)
- [Data Model](specs/001-room-booking-system/data-model.md)
- [Developer Quickstart](specs/001-room-booking-system/quickstart.md)

## License

MIT
