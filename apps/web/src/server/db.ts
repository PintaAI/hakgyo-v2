import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../../generated/prisma/client";

// Validated in src/env.js; read from process.env so scripts (seed, CLI tools)
// can import the client without the full app environment.
function poolSize() {
  const value = Number(process.env.DATABASE_POOL_MAX);
  return Number.isInteger(value) && value > 0 ? value : 10;
}

const createPrismaClient = () => {
  const adapter = new PrismaNeon({
    connectionString: process.env.DATABASE_URL!,
    max: poolSize(),
    // Fail fast instead of queueing forever when the pool is exhausted.
    connectionTimeoutMillis: 5_000,
    // Neon's pooler handles reuse; return idle clients before it drops them.
    idleTimeoutMillis: 30_000,
  });
  return new PrismaClient({ adapter });
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
