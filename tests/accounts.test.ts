import test from "node:test";
import assert from "node:assert/strict";
import { accountBalances, assertSufficientBalances } from "../lib/accounts";

test("transfers preserve family funds and account amounts preserve cents", () => {
  const accounts = [
    { id: "cash", openingBalance: 100.1 },
    { id: "bank", openingBalance: 0 },
  ];
  const balances = accountBalances(
    accounts,
    [{ account: "cash", type: "expense", amount: 20.05 }],
    [{ fromAccountId: "cash", toAccountId: "bank", amount: 30.02 }],
  );
  assert.equal(balances.get("cash"), 5003);
  assert.equal(balances.get("bank"), 3002);
  assert.equal(
    [...balances.values()].reduce((s, n) => s + n, 0),
    8005,
  );
});

test("overdrafts and reversals that consume spent funds are rejected", () => {
  const accounts = [{ id: "cash", name: "Cash" }];
  assert.throws(
    () =>
      assertSufficientBalances(
        new Map([["cash", 100]]),
        new Map([["cash", -1]]),
        accounts,
      ),
    /Insufficient balance/,
  );
  assert.doesNotThrow(() =>
    assertSufficientBalances(
      new Map([["cash", 100]]),
      new Map([["cash", 0]]),
      accounts,
    ),
  );
  assert.throws(() =>
    assertSufficientBalances(
      new Map([["cash", -100]]),
      new Map([["cash", -101]]),
      accounts,
    ),
  );
  assert.doesNotThrow(() =>
    assertSufficientBalances(
      new Map([["cash", -100]]),
      new Map([["cash", -50]]),
      accounts,
    ),
  );
});
