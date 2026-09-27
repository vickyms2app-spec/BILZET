import mongoose from 'mongoose';
import { AUDIT_ACTIONS } from '../utils/constants.mjs';

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    action: {
      type: String,
      enum: Object.values(AUDIT_ACTIONS),
      required: true,
      index: true
    },
    entity: {
      type: String,
      required: true,
      index: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true
    },
    description: {
      type: String,
      required: true
    },
    ipAddress: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

auditLogSchema.index({ createdAt: -1, action: 1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
