import test from "node:test";
import assert from "node:assert/strict";
import { totals, csvCell, Entry } from "../lib/types";
const entry = (type: string, amount: number) => ({ type, amount }) as Entry;
test("balances preserve cents and handle a deficit", () => {
  assert.deepEqual(
    totals([entry("income", 0.1), entry("income", 0.2), entry("expense", 0.4)]),
    { income: 0.3, expense: 0.4, balance: -0.1 },
  );
});
test("empty periods have zero totals", () =>
  assert.deepEqual(totals([]), { income: 0, expense: 0, balance: 0 }));
test("CSV quotes commas, quotes and line breaks", () =>
  assert.equal(csvCell('Family, "food"\nshop'), '"Family, ""food""\nshop"'));
test("CSV neutralizes spreadsheet formulas", () => {
  for (const s of ["=1+1", "+SUM(A1)", "-2+3", "@SUM(A1)", "\t=2", "\r=2"])
    assert.equal(csvCell(s), "\"'" + s + '"');
});
