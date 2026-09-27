import mongoose from 'mongoose';
import { STOCK_TRANSACTION_TYPES } from '../utils/constants.mjs';

const stockTransactionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: Object.values(STOCK_TRANSACTION_TYPES),
      required: true,
      index: true
    },
    quantity: {
      type: Number,
      required: true
    },
    previousStock: {
      type: Number,
      required: true
    },
    newStock: {
      type: Number,
      required: true
    },
    referenceType: {
      type: String,
      enum: ['Purchase', 'Sale', 'Adjustment', 'Return', 'Initial', 'Damage', 'None'],
      default: 'None'
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true
    },
    reason: {
      type: String,
      trim: true,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

stockTransactionSchema.index({ product: 1, createdAt: -1 });

export const StockTransaction = mongoose.model('StockTransaction', stockTransactionSchema);
export default StockTransaction;
