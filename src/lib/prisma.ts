import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Schema revision token to force-reload PrismaClient in dev when schema changes
const SCHEMA_REVISION = "2026-09-10-v3-ipd-admission";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
  schemaRevision: string | undefined;
};

// Discard stale in-memory client if schema was regenerated during active dev session
if (
  process.env.NODE_ENV !== "production" &&
  globalForPrisma.schemaRevision !== SCHEMA_REVISION
) {
  if (globalForPrisma.prisma) {
    try {
      globalForPrisma.prisma.$disconnect();
    } catch {
      // ignore
    }
  }
  globalForPrisma.prisma = undefined;
  globalForPrisma.schemaRevision = SCHEMA_REVISION;
}

// Fallback connection string for build-time static evaluation
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/gias_hospital_db?sslmode=disable";

const pool =
  globalForPrisma.pgPool ??
  new Pool({
    connectionString,
    ssl:
      process.env.DATABASE_URL &&
      !process.env.DATABASE_URL.includes("localhost") &&
      !process.env.DATABASE_URL.includes("127.0.0.1")
        ? { rejectUnauthorized: false }
        : false,
  });

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pool;
  globalForPrisma.schemaRevision = SCHEMA_REVISION;
}

export default prisma;
