import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 requires an explicit driver adapter for SQL providers (no bundled
// query engine binary anymore) — see .agents/skills/prisma-upgrade-v7/references/driver-adapters.md.
// Singleton pattern below survives Next.js dev-mode hot-reload (which would
// otherwise re-import this module and open a new connection pool on every
// edit), per the same reference's "Singleton Pattern" example.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
