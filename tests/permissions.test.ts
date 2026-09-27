import test from "node:test";
import assert from "node:assert/strict";
import { permissions, permissionGroups, expandPermissions } from "../lib/types";

test("every available permission is represented exactly once in the editor", () => {
  const options = permissionGroups.flatMap((g) =>
    g.actions.map((a) => `${g.key}.${a}`),
  );
  assert.deepEqual([...options].sort(), [...permissions].sort());
  assert.equal(new Set(options).size, options.length);
});

test("legacy transaction grants expand without granting unrelated actions", () => {
  assert.deepEqual(
    expandPermissions(["transactions.create", "income.create", "reports.read"]),
    ["income.create", "expense.create", "reports.read"],
  );
  assert.deepEqual(expandPermissions(["income.read"]), ["income.read"]);
});
