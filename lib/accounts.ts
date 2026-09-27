type Amount = number | string | { toString(): string };
export const cents = (value: Amount) => Math.round(Number(value) * 100);

export function accountBalances(
  accounts: { id: string; openingBalance: Amount }[],
  transactions: { account: string; type: string; amount: Amount }[],
  transfers: { fromAccountId: string; toAccountId: string; amount: Amount }[],
) {
  const balances = new Map(
    accounts.map((a) => [a.id, cents(a.openingBalance)]),
  );
  for (const t of transactions)
    balances.set(
      t.account,
      (balances.get(t.account) ?? 0) +
        (t.type === "income" ? 1 : -1) * cents(t.amount),
    );
  for (const t of transfers) {
    balances.set(
      t.fromAccountId,
      (balances.get(t.fromAccountId) ?? 0) - cents(t.amount),
    );
    balances.set(
      t.toAccountId,
      (balances.get(t.toAccountId) ?? 0) + cents(t.amount),
    );
  }
  return balances;
}

export function assertSufficientBalances(
  before: Map<string, number>,
  after: Map<string, number>,
  accounts: { id: string; name: string }[],
) {
  for (const account of accounts) {
    const balance = after.get(account.id) ?? 0;
    // Preserve imported history, but never allow an existing deficit to deepen.
    if (balance < 0 && balance < (before.get(account.id) ?? 0)) {
      throw Error(
        `Insufficient balance in ${account.name}. Available: BDT ${((before.get(account.id) ?? 0) / 100).toFixed(2)}. This change would leave a negative balance.`,
      );
    }
  }
}

export function defaultAccounts() {
  return ["Cash", "Bank", "bKash", "Nagad"].map((name) => ({
    id: name,
    name,
    type: name === "Cash" ? "Cash" : name === "Bank" ? "Bank" : "Mobile",
    bankName: "",
    accountNumber: "",
    branch: "",
    openingBalance: 0,
    active: true,
    balance: 0,
  }));
}
