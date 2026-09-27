import mongoose from 'mongoose';
import { env } from './env.mjs';

let isConnected = false;
let isReplicaSet = false;

export const connectDB = async (uri = env.MONGODB_URI) => {
  if (isConnected) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 2500,
    });

    isConnected = true;
    console.log(`[Database] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    // Detect if connected deployment supports replica set transactions
    try {
      const adminDb = conn.connection.db.admin();
      const status = await adminDb.command({ replSetGetStatus: 1 }).catch(() => null);
      if (status && status.ok === 1) {
        isReplicaSet = true;
        console.log('[Database] Replica set detected: Native multi-document transactions enabled.');
      } else {
        isReplicaSet = false;
        console.log('[Database] Standalone MongoDB detected: Fallback transaction runner enabled.');
      }
    } catch {
      isReplicaSet = false;
    }

    mongoose.connection.on('error', (err) => {
      console.error('[Database] MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      console.warn('[Database] MongoDB disconnected');
    });

  } catch (error) {
    console.error(`[Database] Error connecting to MongoDB: ${error.message}`);
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn('[Database] Notice: MongoDB is not running locally. Start MongoDB service to enable live database persistence.');
    }
  }
};

export const getIsReplicaSet = () => isReplicaSet;

export const disconnectDB = async () => {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.log('[Database] MongoDB disconnected cleanly');
};

export default connectDB;
