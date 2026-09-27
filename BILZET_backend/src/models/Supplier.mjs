import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
      index: true
    },
    phone: {
      type: String,
      required: [true, 'Supplier phone is required'],
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
    openingBalance: {
      type: Number,
      default: 0
    },
    currentBalance: {
      type: Number,
      default: 0
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

supplierSchema.index({ name: 'text', phone: 'text' });

export const Supplier = mongoose.model('Supplier', supplierSchema);
export default Supplier;
