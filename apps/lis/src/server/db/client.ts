import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

export function createPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient(process.env.DATABASE_URL ?? "");

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
