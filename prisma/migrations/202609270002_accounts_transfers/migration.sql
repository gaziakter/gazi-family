
CREATE TABLE "Account" (
 "id" TEXT NOT NULL, "name" TEXT NOT NULL, "type" TEXT NOT NULL,
 "bankName" TEXT NOT NULL DEFAULT '', "accountNumber" TEXT NOT NULL DEFAULT '', "branch" TEXT NOT NULL DEFAULT '',
 "openingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0, "active" BOOLEAN NOT NULL DEFAULT true, "revision" INTEGER NOT NULL DEFAULT 0,
 CONSTRAINT "Account_pkey" PRIMARY KEY ("id"), CONSTRAINT "Account_opening_nonnegative" CHECK ("openingBalance" >= 0)
);
CREATE UNIQUE INDEX "Account_name_key" ON "Account"("name");
INSERT INTO "Account" (id,name,type) VALUES ('Cash','Cash','Cash'),('Bank','Bank','Bank'),('bKash','bKash','Mobile'),('Nagad','Nagad','Mobile');
INSERT INTO "Account" (id,name,type) SELECT DISTINCT account,account,'Bank' FROM "Transaction" WHERE account NOT IN ('Cash','Bank','bKash','Nagad');
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_account_fkey" FOREIGN KEY ("account") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "Transfer" (
 "id" TEXT NOT NULL, "fromAccountId" TEXT NOT NULL, "toAccountId" TEXT NOT NULL, "amount" DECIMAL(14,2) NOT NULL,
 "date" DATE NOT NULL, "note" TEXT NOT NULL DEFAULT '', "userId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "Transfer_different_accounts" CHECK ("fromAccountId" <> "toAccountId"),
 CONSTRAINT "Transfer_positive_amount" CHECK ("amount" > 0),
 CONSTRAINT "Transfer_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "Transfer_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "Transfer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Transfer_date_idx" ON "Transfer"("date");
UPDATE "Role" SET permissions = permissions || ARRAY['accounts.read','transfers.read']::text[] WHERE 'transactions.read' = ANY(permissions);
UPDATE "Role" SET permissions = ARRAY(SELECT DISTINCT p FROM unnest(permissions || ARRAY['accounts.read','accounts.create','accounts.update','accounts.delete','transfers.read','transfers.create','transfers.update','transfers.delete']::text[]) AS p) WHERE name = 'Owner';
