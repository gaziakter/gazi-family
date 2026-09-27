# Happy Family

A personal family account manager built with Next.js App Router, React, PostgreSQL and Prisma. The responsive dashboard includes income and expense records, categories, monthly budgets, savings goals, family members, editable roles, monthly reports, category breakdowns, PDF export and print reports. Navigation and dashboard labels can switch between English and Bengali; amounts use BDT.

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
- Separate View, Create, Update and Delete permissions control each module. Reports have separate View and Export PDF access.
- Passwords use salted scrypt; opaque session tokens are hashed in PostgreSQL. Sessions expire after seven days. Mutation requests check same-origin headers. Login attempts are limited per email per server process; use a shared rate limiter if deploying multiple server instances.
- Click your avatar in the top bar to change your password. Changing it revokes all previous sessions, then signs the current browser back in. Owners can reset another member's password through the member editor.
- Monetary columns use PostgreSQL decimal values. Transactions accept positive values with at most two decimal places; income/expense determines the sign. Balances derive from transactions; accounts are Cash, Bank, bKash and Nagad.
- Reports support monthly, yearly and all-time views, optional date bounds, category, account, family member and search. PDF export includes the filtered rows, totals, selected filters, embedded Bengali text and automatic pagination. Printing uses the browser's print dialog.
- Transaction reports group by date or by head (income/expense category), with group subtotals. Income & Expense Statements group by date or month, with income heads on the left and expense heads on the right, side totals, and surplus or deficit. All four report types export to PDF using the same grouping and calculations as the screen.
- Selecting From/To switches to a custom date range, including ranges across multiple months. An inverted date range is rejected. The month/year/all-time period selectors remain available.
- Monthly budgets calculate spending automatically. Savings goals are manual planning records, tracked separately from ledger balances to avoid double-counting.
- Categories, roles or members used by existing records cannot be deleted. Transaction editors preserve the original recording member. Categories in use cannot change their income/expense type.
- English/Bengali support currently covers navigation and dashboard labels; management forms and validation messages are in English.

## Backups

Back up PostgreSQL regularly with `pg_dump` and restore with `pg_restore`; PDF exports are reports, not a full database backup. The Docker volume persists database contents between restarts. Never run `docker compose down -v` unless you intend to erase that data.

Implementation references: [Next.js App Router](https://nextjs.org/docs/app) and [Prisma 6 PostgreSQL schema](https://www.prisma.io/docs/v6/orm/prisma-schema/overview/data-sources).

Roles use separate View, Create, Update and Delete permissions for income, expenses, categories, budgets, savings goals, family members and roles. Reports use View, Export PDF and Print. Overview has its own View permission. API requests enforce each action; read access filters returned data. Forms and reports may receive category names and member names as lookup data, while member emails and full role permissions require their respective View access. The current user always receives their own profile and role. Existing roles retain their previous access through the CRUD migration. Delegated administrators cannot grant or assign permissions they do not hold.

## Accounts and transfers

Cash & Bank accounts manages account names, bank/provider details, account numbers, branches, opening balances and active status. Existing Cash, Bank, bKash and Nagad entries retain their original account identifiers and amounts during migration. Opening balances default to zero; set genuine starting funds through account management when needed.

Account balances include all saved income, expenses and transfers plus opening funds. Income can be entered at zero balance. An expense or outgoing transfer cannot make its source account negative. Edits and deletions also validate the resulting balances, including reversals of already-spent income or transfers. Existing negative balances are preserved for reconciliation, but cannot be reduced further. Financial mutations run in serializable database transactions with a shared account write to prevent concurrent overspending; conflicting requests return an error and may be retried.

Transfers move funds between any two different active accounts and are recorded separately from income/expense reports. Account deactivation requires zero balance, and accounts with linked entries cannot be deleted. The default Cash account remains active and cannot be deleted. Accounts and transfers have independent CRUD permissions; the migration enables management for Owner and read access for existing ledger readers.

The role editor covers 40 permissions across Overview, Income, Expenses, Categories, Budgets, Savings goals, Cash & Bank accounts, Transfers, Family members, Roles, and Reports. Select all / Clear all affects only permissions the editor is allowed to grant. Income and expense actions are checked independently on the server; changing a transaction type also requires Delete on the original type and Create on the destination type. Reports View authorizes the full income/expense ledger for reporting; without it, only transaction types with View access are returned. Overview displays the modules the user can view. Existing transaction permissions are migrated to equivalent income and expense permissions.
