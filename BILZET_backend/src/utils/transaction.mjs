import mongoose from 'mongoose';
import { getIsReplicaSet } from '../config/db.mjs';

/**
 * Universal transaction runner that supports replica set transactions
 * and falls back gracefully in standalone local development environments.
 *
 * @param {Function} callback - Function receiving session: async (session) => { ... }
 * @returns {Promise<any>} Result of the callback
 */
export const withTransaction = async (callback) => {
  const isReplica = getIsReplicaSet();

  if (isReplica) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } else {
    // Standalone fallback: execute without session
    return await callback(null);
  }
};

export default withTransaction;
