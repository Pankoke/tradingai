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
if (process.env.NODE_ENV === 'production') {
  console.error('db:reset is disabled in production');
  process.exit(1);
}
if (process.env.CONFIRM_DB_RESET !== 'YES') {
  console.error('Set CONFIRM_DB_RESET=YES to run db:reset');
  process.exit(1);
}
(async () => {
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query('BEGIN');
  await client.query('DROP SCHEMA IF EXISTS public CASCADE;');
  await client.query('CREATE SCHEMA public;');
  await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
  await client.query('COMMIT');
  await client.end();
  console.log('Schema reset complete. Running migrations...');
  const { spawn } = require('child_process');
  const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const child = spawn(cmd, ['drizzle-kit', 'migrate'], { stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code ?? 0));
})();
