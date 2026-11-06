import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('5000'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/shop_billing'),
  JWT_SECRET: z.string().optional().transform((val) => (val && val.length >= 32 ? val : 'bilzet_super_secure_jwt_secret_key_2026_production_grade_pos')).default('bilzet_super_secure_jwt_secret_key_2026_production_grade_pos'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().optional().transform((val) => (val && val.length >= 32 ? val : 'bilzet_super_secure_jwt_refresh_secret_key_2026_production_pos')).default('bilzet_super_secure_jwt_refresh_secret_key_2026_production_pos'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  SHOP_NAME: z.string().default('Bilzet Retail Mart'),
  SHOP_PHONE: z.string().default('+91 88254 54486'),
  SHOP_EMAIL: z.string().default('contact@bilzet.com'),
  SHOP_ADDRESS: z.string().default('123 Commercial Plaza, Main Market'),
  SHOP_GSTIN: z.string().default('33AAAAA0000A1Z5'),
  SHOP_STATE: z.string().default('Tamil Nadu'),
  SHOP_STATE_CODE: z.string().default('33'),
  CLERK_SECRET_KEY: z.string().optional().transform((val) => {
    const raw = val || process.env.CLERK_SECRET_KEY;
    const clean = String(raw || '').trim().replace(/^["']|["']$/g, '');
    return clean || 'sk_test_alCaCb1Zy67kRtR6zaGbUibJWm2kjo34eFPLTu5fcu';
  }).default('sk_test_alCaCb1Zy67kRtR6zaGbUibJWm2kjo34eFPLTu5fcu'),
  CLERK_PUBLISHABLE_KEY: z.string().optional().transform((val) => {
    const raw = val || process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY;
    const clean = String(raw || '').trim().replace(/^["']|["']$/g, '');
    return clean || 'pk_test_dW5pdGVkLWJlZGJ1Zy03NTkzLmNsZXJrLmFjY291bnRzLmRldiQ';
  }).default('pk_test_dW5pdGVkLWJlZGJ1Zy03NTkzLmNsZXJrLmFjY291bnRzLmRldiQ'),
  SMTP_HOST: z.string().optional().default('smtp.gmail.com'),
  SMTP_PORT: z.string().optional().default('587'),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_SECURE: z.string().optional().default('false'),
  SMTP_FROM: z.string().optional().default('no-reply@bilzet.com'),
  ALLOW_MOCK_EMAIL: z.string().optional().default('true'),
  RAZORPAY_KEY_ID: z.string().optional().default('rzp_test_bilzet2026'),
  RAZORPAY_KEY_SECRET: z.string().optional().default('bilzet_rzp_secret_key_2026'),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default('bilzet_webhook_secret_2026'),
  RAZORPAY_PRO_PLAN_ID: z.string().optional().default('plan_bilzet_pro_annual'),
  RAZORPAY_PREMIUM_PLAN_ID: z.string().optional().default('plan_bilzet_premium_annual'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
export default env;
