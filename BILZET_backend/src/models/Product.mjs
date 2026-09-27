import mongoose from 'mongoose';
import { PRODUCT_UNITS } from '../utils/constants.mjs';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    barcode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
      index: true
    },
    brand: {
      type: String,
      trim: true,
      default: ''
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    unit: {
      type: String,
      enum: PRODUCT_UNITS,
      default: 'piece'
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Purchase price is required'],
      min: [0, 'Purchase price cannot be negative']
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative']
    },
    gstRate: {
      type: Number,
      default: 0,
      min: [0, 'GST rate cannot be negative'],
      max: [100, 'GST rate cannot exceed 100%']
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative']
    },
    minimumStock: {
      type: Number,
      default: 5,
      min: [0, 'Minimum stock cannot be negative']
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

// Compound index for common query combinations
productSchema.index({ name: 'text', brand: 'text', description: 'text' });
productSchema.index({ isActive: 1, stock: 1, minimumStock: 1 });

export const Product = mongoose.model('Product', productSchema);
export default Product;
