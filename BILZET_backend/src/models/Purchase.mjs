import mongoose from 'mongoose';
import { PAYMENT_STATUSES } from '../utils/constants.mjs';

const purchaseItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: 0
    },
    gstRate: {
      type: Number,
      default: 0,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    tax: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    purchaseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true
    },
    items: [purchaseItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    tax: {
      type: Number,
      default: 0,
      min: 0
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    dueAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUSES),
      default: PAYMENT_STATUSES.PAID
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
      index: true
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

purchaseSchema.index({ createdAt: -1, supplier: 1 });

export const Purchase = mongoose.model('Purchase', purchaseSchema);
export default Purchase;
