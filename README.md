# Gazi Family

A personal family account manager built with Next.js App Router, React, PostgreSQL and Prisma. The responsive dashboard includes income and expense records, categories, monthly budgets, savings goals, family members, editable roles, monthly reports, category breakdowns, CSV export and print reports. Navigation and dashboard labels can switch between English and Bengali; amounts use BDT.

## Preview

```powershell
npm.cmd install
npm.cmd run dev
```

Open http://localhost:3000. Without `DATABASE_URL`, the app opens a clearly labelled **demo workspace**. Demo changes persist only in that browser's local storage. Demo accounts are illustrative and cannot sign in. Clearing the `gazi-family-demo-v1` local-storage key resets the demo. Never enter real private information in the demo.

The demo is also always available at http://localhost:3000/demo, including when PostgreSQL is configured.

### This Windows workspace

A separate PostgreSQL cluster is configured under ignored `.local/postgres`, listening only on `127.0.0.1:55432`. Its generated credentials live in ignored `.env`. It does not modify the pre-existing PostgreSQL installation's databases. The application database starts empty: open `/` to create your own Owner account.

After restarting Windows, start this project's database with:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/local-db.ps1
npm.cmd run dev
```

Stop the project's database with the same script and `-Action stop`. The script requires PostgreSQL 18 at its default Windows install location; other machines can use the Docker instructions below.

## Real PostgreSQL setup

Requires Node.js 22+ (LTS recommended) and PostgreSQL 17, or Docker Desktop for the included Compose service.

```powershell
Copy-Item .env.example .env
docker compose up -d
npm.cmd run db:generate
npm.cmd run db:deploy
npm.cmd run dev
```

If you already have PostgreSQL, replace `DATABASE_URL` in `.env` with its connection string instead of running Docker. The example database credentials are for local development. Restart the app after setting environment variables. The first visit creates your Owner account and starter categories; no demo transactions are inserted into your database. Store your owner password safely.

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:integration
npm.cmd start
```

Use HTTPS for a production deployment: session cookies are Secure in production. Configure `DATABASE_URL` on the server and run migrations before starting. Do not expose an uninitialized installation publicly: create the Owner account first. The app manages one family per database.

Browser/integration tests require `npx playwright install chromium`, a production build, and a database user with permission to create a temporary test database. Tests run on port 3101, create a uniquely named test database, and remove only that test database afterward. Your main family database is not seeded or changed by tests.

## Permissions and data

- Owner is protected against removal and role changes. Owners create members with initial passwords and assign Member, Viewer or custom roles.
- All signed-in members can view the family's shared ledger, budgets, goals, member names/emails and role definitions. Role permissions govern server-side writes and access to the report UI/export.
- Passwords use salted scrypt; opaque session tokens are hashed in PostgreSQL. Sessions expire after seven days. Mutation requests check same-origin headers. Login attempts are limited per email per server process; use a shared rate limiter if deploying multiple server instances.
- Click your avatar in the top bar to change your password. Changing it revokes all previous sessions, then signs the current browser back in. Owners can reset another member's password through the member editor.
- Monetary columns use PostgreSQL decimal values. Transactions accept positive values with at most two decimal places; income/expense determines the sign. Balances derive from transactions; accounts are Cash, Bank, bKash and Nagad.
- Reports support monthly, yearly and all-time views, optional date bounds, category, account, family member and search. CSV export includes the filtered rows and escapes spreadsheet formulas. Printing uses the browser's print dialog.
- Monthly budgets calculate spending automatically. Savings goals are manual planning records, tracked separately from ledger balances to avoid double-counting.
- Categories, roles or members used by existing records cannot be deleted. Transaction editors preserve the original recording member. Categories in use cannot change their income/expense type.
- English/Bengali support currently covers navigation and dashboard labels; management forms and validation messages are in English.

## Backups

Back up PostgreSQL regularly with `pg_dump` and restore with `pg_restore`; CSV exports are reports, not a full database backup. The Docker volume persists database contents between restarts. Never run `docker compose down -v` unless you intend to erase that data.

Implementation references: [Next.js App Router](https://nextjs.org/docs/app) and [Prisma 6 PostgreSQL schema](https://www.prisma.io/docs/v6/orm/prisma-schema/overview/data-sources).
