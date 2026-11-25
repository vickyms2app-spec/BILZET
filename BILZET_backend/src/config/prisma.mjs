import resilientPrisma, { rawPrisma } from './resilientPrisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';

const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ?? resilientPrisma;
const authoritativePrisma = globalForPrisma.rawPrisma ?? rawPrisma ?? null;

globalForPrisma.prisma = prisma;
if (authoritativePrisma) {
  globalForPrisma.rawPrisma = authoritativePrisma;
}

export const getAuthoritativePrisma = () => {
  if (!authoritativePrisma) {
    throw new ApiError(
      503,
      'Invoice service temporarily unavailable: database client is not initialized'
    );
  }
  return authoritativePrisma;
};

export { authoritativePrisma as rawPrisma };
export default prisma;
