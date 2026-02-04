#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}
(async () => {
  const client = new Client({ connectionString: url });
  await client.connect();
  const rowsTables = await client.query("select count(*)::int as tables from information_schema.tables where table_schema='public';");
  const tables = rowsTables.rows[0]?.tables ?? 0;
  let migrationsTableExists = false;
  let migrationsCount = 0;
  try {
    const check = await client.query("select count(*)::int as cnt from information_schema.tables where table_schema='public' and table_name='__drizzle_migrations';");
    migrationsTableExists = check.rows[0]?.cnt > 0;
    if (migrationsTableExists) {
      const cnt = await client.query('select count(*)::int as cnt from __drizzle_migrations;');
      migrationsCount = cnt.rows[0]?.cnt ?? 0;
    }
  } catch (err) {
    migrationsTableExists = false;
  }
  console.log(`DB tables: ${tables}`);
  console.log(`Drizzle migrations table: ${migrationsTableExists ? 'present' : 'missing'}`);
  console.log(`Recorded migrations: ${migrationsCount}`);
  if (tables > 0 && (!migrationsTableExists || migrationsCount === 0)) {
    console.warn('Warning: DB has tables but migrations table is missing/empty. Migrate may fail with "already exists".');
  }
  await client.end();
})();
