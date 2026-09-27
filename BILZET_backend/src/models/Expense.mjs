import mongoose from 'mongoose';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../utils/constants.mjs';

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true
    },
    category: {
      type: String,
      enum: EXPENSE_CATEGORIES,
      required: [true, 'Category is required'],
      index: true
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0.01, 'Amount must be greater than 0']
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    date: {
      type: Date,
      default: Date.now,
      index: true
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: 'cash'
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

expenseSchema.index({ date: -1, category: 1 });

export const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
