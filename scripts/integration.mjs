import { PrismaClient } from "@prisma/client";
import { execFileSync } from "node:child_process";
process.loadEnvFile(".env");
const original = process.env.DATABASE_URL;
const databaseName = "gazi_family_test_" + Date.now();
const db = new PrismaClient({ datasourceUrl: original });
try {
  await db.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
  const url = new URL(original);
  url.pathname = "/" + databaseName;
  const env = { ...process.env, DATABASE_URL: url.toString() };
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    { env, stdio: "inherit", windowsHide: true },
  );
  execFileSync(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test"],
    { env, stdio: "inherit", windowsHide: true },
  );
} catch (e) {
  console.error("Integration checks failed. See the test output above.");
  process.exitCode = 1;
} finally {
  await db.$executeRawUnsafe(
    `DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`,
  );
  await db.$disconnect();
}
