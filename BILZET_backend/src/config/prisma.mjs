import resilientPrisma from './resilientPrisma.mjs';

const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ?? resilientPrisma;

globalForPrisma.prisma = prisma;

export default prisma;
