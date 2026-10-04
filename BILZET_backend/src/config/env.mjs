import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('5000'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/shop_billing'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long — set it in your .env file'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long — set it in your .env file'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  SHOP_NAME: z.string().default('Bilzet Retail Mart'),
  SHOP_PHONE: z.string().default(''),
  SHOP_EMAIL: z.string().default(''),
  SHOP_ADDRESS: z.string().default(''),
  SHOP_GSTIN: z.string().default(''),
  SHOP_STATE: z.string().default(''),
  SHOP_STATE_CODE: z.string().default(''),
  CLERK_SECRET_KEY: z.string().optional().default(''),
  CLERK_PUBLISHABLE_KEY: z.string().optional().default('')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
export default env;
