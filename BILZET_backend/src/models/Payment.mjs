import mongoose from 'mongoose';
import { PAYMENT_METHODS } from '../utils/constants.mjs';

const paymentSchema = new mongoose.Schema(
  {
    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      default: null,
      index: true
    },
    purchase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
      default: null,
      index: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
      index: true
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
      index: true
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0.01, 'Payment amount must be greater than 0']
    },
    method: {
      type: String,
      enum: PAYMENT_METHODS,
      required: [true, 'Payment method is required']
    },
    type: {
      type: String,
      enum: ['SALE_PAYMENT', 'CREDIT_COLLECTION', 'PURCHASE_PAYMENT', 'SALE_REFUND'],
      default: 'SALE_PAYMENT',
      index: true
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['COMPLETED', 'PENDING', 'FAILED', 'REFUNDED'],
      default: 'COMPLETED'
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      index: true
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

paymentSchema.index({ paymentDate: -1, customer: 1 });
paymentSchema.index({ paymentDate: -1, method: 1 });

export const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
