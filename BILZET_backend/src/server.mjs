import app from './app.mjs';
import { env } from './config/env.mjs';
import prisma from './config/prisma.mjs';

let server;

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception:', err.message);
  console.error(err.stack);
  process.exit(1);
});

const startServer = async () => {
  try {
    // 1. Attempt Prisma connection in background (non-blocking for Neon cold starts)
    prisma.$connect()
      .then(() => {
        console.log('[Database] Connected to PostgreSQL on NeonDB via Prisma.');
      })
      .catch((err) => {
        console.warn('[Database] NeonDB serverless connection warming up:', err.message);
      });

    // 2. Start Express Server
    server = app.listen(env.PORT, () => {
      console.log(`[Server] Bilzet Shop Billing Backend running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      console.log(`[Server] Health Check available at http://localhost:${env.PORT}/api/v1/health`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('[Process] Unhandled Rejection at:', promise, 'reason:', reason);
      if (server) {
        server.close(() => process.exit(1));
      } else {
        process.exit(1);
      }
    });

    // Graceful Shutdown Handlers
    const handleShutdown = async (signal) => {
      console.log(`\n[Process] ${signal} signal received: closing HTTP server and database...`);
      if (server) {
        server.close(async () => {
          console.log('[Server] HTTP server closed.');
          await prisma.$disconnect();
          process.exit(0);
        });
      } else {
        await prisma.$disconnect();
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error) {
    console.error(`[Server] Fatal startup error: ${error.message}`);
    process.exit(1);
  }
};

startServer();

export { app };
