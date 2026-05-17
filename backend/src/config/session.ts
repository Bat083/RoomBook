import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';

const PgSession = connectPgSimple(session);

// Create PostgreSQL connection pool for sessions
const sessionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const sessionConfig: session.SessionOptions = {
  store: new PgSession({
    pool: sessionPool,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10), // 24 hours default
    sameSite: 'lax',
  },
};
