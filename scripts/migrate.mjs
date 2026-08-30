#!/usr/bin/env node
/**
 * Apply JU PICKS migration chain to DATABASE_URL.
 * Fails immediately on any migration error. No silent skips.
 *
 * Usage:
 *   DATABASE_URL=postgres://... node scripts/migrate.mjs
 */

import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "supabase", "migrations");

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL (or SUPABASE_DB_URL) is required");
  process.exit(1);
}

async function getClient() {
  const pg = await import("pg");
  const Client = pg.default?.Client || pg.Client;
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  return client;
}

async function main() {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.error("No migration files found in", migrationsDir);
    process.exit(1);
  }

  console.log(`Applying ${files.length} migrations to database...`);
  const client = await getClient();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    for (const file of files) {
      const already = await client.query(
        `SELECT 1 FROM schema_migrations WHERE filename = $1`,
        [file],
      );
      if (already.rowCount > 0) {
        console.log(`  skip (applied): ${file}`);
        continue;
      }

      const sql = readFileSync(join(migrationsDir, file), "utf8");
      console.log(`  apply: ${file}`);
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
          `INSERT INTO schema_migrations (filename) VALUES ($1)`,
          [file],
        );
        await client.query("COMMIT");
        console.log(`  ok: ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`  FAIL: ${file}`);
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    }

    console.log("Migrations complete.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
