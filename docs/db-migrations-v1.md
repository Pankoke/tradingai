# DB Migrations (drizzle)

## Commands
- Check status: npm run db:status
- Apply migrations: npm run db:migrate
- DEV reset (drops public schema!): CONFIRM_DB_RESET=YES npm run db:reset

## Fresh setup
1) Set DATABASE_URL in .env.local
2) npm run db:migrate

## Existing dev DB
1) npm run db:status
2) If warning about tables without migrations, choose:
   - Reset (dev only): CONFIRM_DB_RESET=YES npm run db:reset
   - Or manually align __drizzle_migrations (see Troubleshooting)

## CI
- Use fresh database per run
- npm run db:migrate before tests

## Troubleshooting
- Missing pgcrypto: enable extension (reset script already does CREATE EXTENSION IF NOT EXISTS pgcrypto)
- "relation already exists": DB has schema but migrations table empty/outdated; reset or repair migrations table.
- Journal drift fixed in PR1: drizzle/meta/_journal.json matches files 0000-0009.
