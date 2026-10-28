import { PrismaClient } from "@prisma/client";

/**
 * PrismaClient singleton instance to prevent multiple connections
 * during Next.js App Router fast-refresh / hot-reloading in development mode.
 * 
 * In production, a standard single instance is maintained per serverless / node container.
 */
const prismaClientSingleton = () => {
  return new PrismaClient({
    // Printing every query slows the dev server down a lot; turn it on only when debugging
    log:
      process.env.PRISMA_LOG_QUERIES === "true"
        ? ["query", "error", "warn"]
        : process.env.NODE_ENV === "development"
          ? ["error", "warn"]
          : ["error"],
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
