import mongoose from 'mongoose';
import { PAYMENT_METHODS, PAYMENT_STATUSES, SALE_STATUSES } from '../utils/constants.mjs';

const saleItemSnapshotSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    sku: {
      type: String,
      required: true
    },
    barcode: {
      type: String,
      default: ''
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
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
    },
    returnedQuantity: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { _id: false }
);

const saleReturnSchema = new mongoose.Schema(
  {
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 },
        refundPrice: { type: Number, required: true, min: 0 }
      }
    ],
    refundAmount: {
      type: Number,
      required: true,
      min: 0
    },
    refundMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: 'cash'
    },
    reason: {
      type: String,
      trim: true,
      default: ''
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    returnDate: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
      index: true
    },
    items: [saleItemSnapshotSchema],
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
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      required: true
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUSES),
      default: PAYMENT_STATUSES.PAID
    },
    status: {
      type: String,
      enum: Object.values(SALE_STATUSES),
      default: SALE_STATUSES.COMPLETED,
      index: true
    },
    returns: [saleReturnSchema],
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    notes: {
      type: String,
      trim: true,
      default: ''
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

saleSchema.index({ createdAt: -1, customer: 1 });
saleSchema.index({ createdAt: -1, cashier: 1 });
saleSchema.index({ createdAt: -1, paymentStatus: 1 });

export const Sale = mongoose.model('Sale', saleSchema);
export default Sale;
