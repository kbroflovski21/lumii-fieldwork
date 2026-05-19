import { PrismaClient } from "../../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function parseDatabaseUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port, 10) || 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1),
    connectionLimit: parseInt(parsed.searchParams.get("connection_limit") ?? "10", 10),
  };
}

function createPrismaClient(): PrismaClient {
  const config = parseDatabaseUrl(process.env.DATABASE_URL!);
  const adapter = new PrismaMariaDb(config);
  return new PrismaClient({ adapter }) as unknown as PrismaClient;
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
