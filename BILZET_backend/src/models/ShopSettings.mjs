import mongoose from 'mongoose';

const shopSettingsSchema = new mongoose.Schema(
  {
    shopName: {
      type: String,
      required: true,
      default: 'Bilzet Retail Mart'
    },
    ownerName: {
      type: String,
      default: 'Bilzet Store Owner'
    },
    phone: {
      type: String,
      default: '+91 9876543210'
    },
    email: {
      type: String,
      default: 'contact@bilzet.com'
    },
    address: {
      type: String,
      default: '123 Commercial Plaza, Main Market'
    },
    city: {
      type: String,
      default: 'Bengaluru'
    },
    state: {
      type: String,
      default: 'Karnataka'
    },
    pincode: {
      type: String,
      default: '560001'
    },
    gstin: {
      type: String,
      default: '29ABCDE1234F1Z5'
    },
    logo: {
      type: String,
      default: ''
    },
    invoicePrefix: {
      type: String,
      default: 'INV'
    },
    currency: {
      type: String,
      default: 'INR'
    },
    taxSettings: {
      enableGst: { type: Boolean, default: true },
      defaultGstRate: { type: Number, default: 18 }
    },
    upiId: {
      type: String,
      default: 'merchant@upi'
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

export const ShopSettings = mongoose.model('ShopSettings', shopSettingsSchema);
export default ShopSettings;
