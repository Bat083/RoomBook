import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import passport from 'passport';
import { sessionConfig } from './config/session';
import { configurePassport } from './config/passport';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiters } from './middleware/rateLimit';

// Initialize Express app
const app: Application = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session(sessionConfig));

// Passport middleware
configurePassport(passport);
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting
app.use('/api/v1/auth/login', rateLimiters.login);
app.use('/api/v1/bookings', rateLimiters.booking);
app.use('/api/v1', rateLimiters.general);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Import routes
import authRoutes from './routes/authRoutes';
import roomRoutes from './routes/roomRoutes';
import bookingRoutes from './routes/bookingRoutes';
import calendarRoutes from './routes/calendarRoutes';
import notificationRoutes from './routes/notificationRoutes';

// Register API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/rooms', roomRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/calendar', calendarRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start cron jobs (User Story 3: FR-019, FR-020, FR-027)
import { startNoShowCron } from './jobs/noShowCron';
import { startCompletionCron } from './jobs/completionCron';

// Only start cron jobs if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startNoShowCron(); // Runs every 1 minute to detect no-shows
  startCompletionCron(); // Runs every 5 minutes to auto-complete bookings
}

export default app;
