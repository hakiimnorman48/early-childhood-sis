import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const dbUrl = process.env["DATABASE_URL"] ?? "file:./dev.db";
const dbPath = dbUrl.replace("file:", "");
const resolvedPath = path.isAbsolute(dbPath)
  ? dbPath
  : path.resolve(process.cwd(), "prisma", dbPath.replace("./", ""));

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: dbUrl,
    adapter: new PrismaBetterSqlite3({ url: resolvedPath }),
  },
});
