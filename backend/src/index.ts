import dotenv from 'dotenv';
import app from './app';
import { verifyEmailConfig } from './config/email';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

// Start server
async function startServer() {
  try {
    // Verify email configuration (non-blocking)
    await verifyEmailConfig();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API URL: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
