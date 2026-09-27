import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  });
};

const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// Cache on globalThis across all environments for serverless container reuse
globalForPrisma.prisma = prisma;

export default prisma;
export { prisma };
