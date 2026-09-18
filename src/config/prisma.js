const { PrismaClient } = require("@prisma/client");

let dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  const u = new URL(dbUrl);
  if (!u.searchParams.has("connection_limit")) {
    u.searchParams.set("connection_limit", "7");
  }
  if (!u.searchParams.has("connect_timeout")) {
    u.searchParams.set("connect_timeout", "15");
  }
  if (!u.searchParams.has("pool_timeout")) {
    u.searchParams.set("pool_timeout", "20");
  }
  dbUrl = u.toString();
}

const prisma = new PrismaClient({
  ...(dbUrl ? { datasources: { db: { url: dbUrl } } } : {}),
  transactionOptions: {
    maxWait: 10000,
    timeout: 20000,
  },
});

module.exports = prisma;