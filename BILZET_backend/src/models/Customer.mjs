import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      index: true
    },
    phone: {
      type: String,
      required: [true, 'Customer phone is required'],
      trim: true,
      index: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: ''
    },
    creditLimit: {
      type: Number,
      default: 0,
      min: [0, 'Credit limit cannot be negative']
    },
    currentCredit: {
      type: Number,
      default: 0,
      min: [0, 'Current credit cannot be negative']
    },
    isActive: {
      type: Boolean,
      default: true,
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

customerSchema.index({ name: 'text', phone: 'text' });

export const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
