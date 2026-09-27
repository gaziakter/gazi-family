import { test, expect } from "@playwright/test";
const origin = "http://localhost:3101";
const credentials = {
  email: "owner@test.invalid",
  password: "Owner-test-password-123",
};
test("all grouped reports export PDF and date ranges work across months", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/demo");
  await page.getByRole("button", { name: "Reports", exact: true }).click();
  await page.getByLabel("From", { exact: true }).fill("2020-01-01");
  await page.getByLabel("To", { exact: true }).fill("2099-01-01");
  await expect(page.getByLabel("Report month", { exact: true })).toHaveCount(0);
  await page.getByLabel("To", { exact: true }).fill("2019-01-01");
  await expect(page.getByRole("button", { name: "Export PDF" })).toBeDisabled();
  await page.getByLabel("To", { exact: true }).fill("2099-01-01");
  for (const mode of [
    "transactions-date",
    "transactions-head",
    "statement-date",
    "statement-month",
  ]) {
    await page
      .getByRole("combobox", { name: "Report type" })
      .selectOption(mode);
    if (mode === "statement-month") {
      await expect(page.getByLabel("From", { exact: true })).toHaveCount(0);
      await page.getByLabel("Report month", { exact: true }).fill("2026-09");
      await expect(page.locator(".report-group")).toHaveCount(1);
      await expect(page.locator(".report-group")).toContainText("2026-09");
    } else {
      await expect(page.getByLabel("From", { exact: true })).toBeVisible();
      await expect(page.getByLabel("To", { exact: true })).toBeVisible();
      await expect(
        page.getByLabel("Report month", { exact: true }),
      ).toHaveCount(0);
    }
    await expect(page.locator(".report-group").first()).toBeVisible();
    const requestPromise = page.waitForRequest((r) =>
      r.url().endsWith("/api/reports/pdf"),
    );
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export PDF" }).click();
    expect((await download).suggestedFilename()).toContain(mode);
    const payload = (await requestPromise).postDataJSON();
    expect(payload.period).toBe(mode === "statement-month" ? "month" : "date");
    if (mode === "statement-month") {
      expect(payload.month).toBe("2026-09");
      expect(payload.from).toBe("");
      expect(payload.to).toBe("");
    }
  }
  await page.screenshot({
    path: "test-results/trial-report-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page
      .locator(".report-summary h2")
      .evaluateAll((nodes) =>
        nodes.every((node) => node.scrollWidth <= node.clientWidth),
      ),
  ).toBeTruthy();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/trial-report-mobile.png",
    fullPage: true,
  });
});
test("setup, server authorization, persistence and relational validation", async ({
  playwright,
}) => {
  const owner = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  const anonymous = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  expect((await anonymous.get("/api/data")).status()).toBe(401);
  expect(
    (
      await owner.post("/api/auth", {
        data: { action: "setup", name: "Test Owner", ...credentials },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await anonymous.post("/api/auth", {
        data: {
          action: "setup",
          name: "Second Owner",
          email: "second@test.invalid",
          password: "Another-password-123",
        },
      })
    ).ok(),
  ).toBeFalsy();
  let data = await (await owner.get("/api/data")).json();
  expect(data.users).toHaveLength(1);
  expect(data.transactions).toHaveLength(0);
  const grocery = data.categories.find(
    (c: { name: string }) => c.name === "Groceries",
  );
  const salary = data.categories.find(
    (c: { name: string }) => c.name === "Salary",
  );
  const save = (collection: string, values: object, id?: string) =>
    owner.post("/api/data", {
      data: { collection, action: "save", values, id },
    });
  expect(
    (
      await save(
        "accounts",
        { name: "Cash", type: "Cash", openingBalance: 50000, active: true },
        "Cash",
      )
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await save("transactions", {
        title: "Test groceries",
        type: "expense",
        amount: 1234.56,
        date: "2026-09-20",
        account: "Cash",
        categoryId: grocery.id,
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await save("transactions", {
        title: "Wrong category",
        type: "expense",
        amount: 100,
        date: "2026-09-20",
        account: "Cash",
        categoryId: salary.id,
      })
    ).ok(),
  ).toBeFalsy();
  expect(
    (
      await save("transactions", {
        title: "Negative",
        type: "expense",
        amount: -1,
        date: "2026-09-20",
        account: "Cash",
        categoryId: grocery.id,
      })
    ).ok(),
  ).toBeFalsy();
  expect(
    (
      await save("budgets", {
        categoryId: grocery.id,
        month: "2026-09",
        amount: 5000,
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await save("budgets", {
        categoryId: grocery.id,
        month: "2026-09",
        amount: 9000,
      })
    ).ok(),
  ).toBeFalsy();
  expect(
    (
      await owner.post("/api/data", {
        data: { collection: "categories", action: "delete", id: grocery.id },
      })
    ).ok(),
  ).toBeFalsy();
  expect(
    (await save("roles", { name: "Limited", permissions: [] })).ok(),
  ).toBeTruthy();
  data = await (await owner.get("/api/data")).json();
  expect(data.transactions[0].amount).toBe(1234.56);
  expect(
    (
      await save("users", {
        name: "Read Only",
        email: "viewer@test.invalid",
        password: "Viewer-test-password-123",
        roleId: data.roles.find((r: { name: string }) => r.name === "Limited")
          .id,
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await save(
        "roles",
        { name: "Renamed Owner", permissions: [] },
        data.roles.find((r: { name: string }) => r.name === "Owner").id,
      )
    ).ok(),
  ).toBeFalsy();
  const viewer = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  expect(
    (
      await viewer.post("/api/auth", {
        data: {
          action: "login",
          email: "viewer@test.invalid",
          password: "Viewer-test-password-123",
        },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await viewer.post("/api/data", {
        data: {
          collection: "transactions",
          action: "delete",
          id: data.transactions[0].id,
        },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await owner.post("/api/data", {
        headers: { Origin: "https://different.invalid" },
        data: {
          collection: "transactions",
          action: "delete",
          id: data.transactions[0].id,
        },
      })
    ).status(),
  ).toBe(403);
  const limitedRole = data.roles.find(
    (r: { name: string }) => r.name === "Limited",
  );
  const restricted = await (await viewer.get("/api/data")).json();
  for (const collection of ["transactions", "categories", "budgets", "goals"])
    expect(restricted[collection]).toEqual([]);
  expect(restricted.users).toHaveLength(1);
  expect(restricted.roles).toHaveLength(1);
  expect(restricted.accounts).toEqual([]);
  expect(restricted.transfers).toEqual([]);
  for (const collection of ["accounts", "transfers"])
    expect(
      (
        await viewer.post("/api/data", {
          data: { collection, action: "save", values: {} },
        })
      ).status(),
    ).toBe(403);
  // Every resource checks the requested operation, even for direct API requests.
  for (const collection of [
    "transactions",
    "categories",
    "budgets",
    "goals",
    "users",
    "roles",
  ]) {
    for (const granted of ["create", "update", "delete"]) {
      expect(
        (
          await save(
            "roles",
            { name: "Limited", permissions: [collection + "." + granted] },
            limitedRole.id,
          )
        ).ok(),
      ).toBeTruthy();
      for (const operation of ["create", "update", "delete"]) {
        const response = await viewer.post("/api/data", {
          data: {
            collection,
            action: operation === "delete" ? "delete" : "save",
            ...(operation === "create" ? {} : { id: "missing-record" }),
            values: {},
          },
        });
        expect(response.status()).toBe(operation === granted ? 400 : 403);
      }
    }
  }
  await save(
    "roles",
    {
      name: "Limited",
      permissions: ["transactions.read", "transactions.create"],
    },
    limitedRole.id,
  );
  const visible = await (await viewer.get("/api/data")).json();
  expect(visible.transactions.length).toBeGreaterThan(0);
  const transaction = {
    title: "CRUD permission check",
    type: "expense",
    amount: 25,
    date: "2026-09-26",
    account: "Cash",
    categoryId: grocery.id,
    note: "",
  };
  expect(
    (
      await viewer.post("/api/data", {
        data: {
          collection: "transactions",
          action: "save",
          values: transaction,
        },
      })
    ).ok(),
  ).toBeTruthy();
  const created = (
    await (await viewer.get("/api/data")).json()
  ).transactions.find((t: { title: string }) => t.title === transaction.title);
  await save(
    "roles",
    { name: "Limited", permissions: ["transactions.update"] },
    limitedRole.id,
  );
  expect(
    (
      await viewer.post("/api/data", {
        data: {
          collection: "transactions",
          action: "save",
          id: created.id,
          values: { ...transaction, amount: 30 },
        },
      })
    ).ok(),
  ).toBeTruthy();
  await save(
    "roles",
    { name: "Limited", permissions: ["transactions.delete"] },
    limitedRole.id,
  );
  expect(
    (
      await viewer.post("/api/data", {
        data: { collection: "transactions", action: "delete", id: created.id },
      })
    ).ok(),
  ).toBeTruthy();
  await save(
    "roles",
    { name: "Limited", permissions: ["reports.read"] },
    limitedRole.id,
  );
  const reportFilters = {
    demo: false,
    month: "2026-09",
    period: "month",
    account: "all",
    categoryId: "all",
    memberId: "all",
    search: "",
    from: "",
    to: "",
  };
  expect(
    (
      await anonymous.post("/api/reports/pdf", { data: reportFilters })
    ).status(),
  ).toBe(401);
  expect(
    (await viewer.post("/api/reports/pdf", { data: reportFilters })).status(),
  ).toBe(403);
  const pdf = await owner.post("/api/reports/pdf", { data: reportFilters });
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
  expect(
    (
      await owner.post("/api/reports/pdf", {
        data: {
          ...reportFilters,
          period: "date",
          from: "2026-10-01",
          to: "2026-09-01",
        },
      })
    ).status(),
  ).toBe(400);
  const oldSession = await owner.storageState();
  expect(
    (
      await owner.post("/api/password", {
        data: {
          currentPassword: credentials.password,
          password: "Updated-owner-password-123",
        },
      })
    ).ok(),
  ).toBeTruthy();
  const stale = await playwright.request.newContext({
    baseURL: origin,
    storageState: oldSession,
  });
  expect((await stale.get("/api/data")).status()).toBe(401);
  expect(
    (
      await owner.post("/api/password", {
        data: {
          currentPassword: "Updated-owner-password-123",
          password: credentials.password,
        },
      })
    ).ok(),
  ).toBeTruthy();
  await Promise.all([
    owner.dispose(),
    anonymous.dispose(),
    viewer.dispose(),
    stale.dispose(),
  ]);
});
test("real member login, add and edit transaction, export report", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Email address").fill(credentials.email);
  await page.getByLabel("Password", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A little more peace of mind." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await page.getByLabel("Description").fill("Browser groceries");
  await page.getByLabel("Amount (৳)").fill("450.25");
  await page
    .getByLabel("Category", { exact: true })
    .selectOption({ label: "Groceries" });
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(
    page.getByText("Browser groceries", { exact: true }),
  ).toBeVisible();
  const row = page.getByRole("row").filter({ hasText: "Browser groceries" });
  await row.getByRole("button", { name: "Edit record" }).click();
  await page.getByLabel("Amount (৳)").fill("500.50");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(row).toContainText("500.5");
  await page.reload();
  await expect(
    page.getByText("Browser groceries", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reports", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF" }).click();
  expect((await download).suggestedFilename()).toMatch(
    /happy-family-.*\.pdf/,
  );
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome home" }),
  ).toBeVisible();
});
test("demo dashboard, filters, modal persistence and mobile layout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/demo");
  await expect(page.getByText("Demo workspace")).toBeVisible();
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await page.getByLabel("Description").fill("Demo browser expense");
  await page.getByLabel("Amount (৳)").fill("89.99");
  await page
    .getByLabel("Category", { exact: true })
    .selectOption({ label: "Groceries" });
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.getByText("Demo browser expense")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Demo browser expense")).toBeVisible();
  await page.getByRole("button", { name: "Expenses", exact: true }).click();
  await page
    .getByPlaceholder("Search transactions…")
    .fill("Demo browser expense");
  await expect(page.getByRole("row")).toHaveCount(2);
  await page.getByRole("button", { name: "Delete record" }).click();
  await page
    .getByRole("button", { name: "Delete record", exact: true })
    .last()
    .click();
  await expect(page.getByText("No transactions yet")).toBeVisible();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("button", { name: "Savings goals", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Savings goals", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("bank accounts, transfers, overdraft protection and concurrent spending", async ({
  playwright,
}) => {
  const owner = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  try {
    expect(
      (
        await owner.post("/api/auth", {
          data: { action: "login", ...credentials },
        })
      ).ok(),
    ).toBeTruthy();
    const save = (collection: string, values: object, id?: string) =>
      owner.post("/api/data", {
        data: { collection, action: "save", values, id },
      });
    const remove = (collection: string, id: string) =>
      owner.post("/api/data", { data: { collection, action: "delete", id } });
    const read = async () => await (await owner.get("/api/data")).json();
    const initial = await read();
    const categoryId = initial.categories.find(
      (c: { type: string }) => c.type === "expense",
    ).id;
    expect(
      (
        await save("accounts", {
          name: "Test Bank A",
          type: "Bank",
          bankName: "Example Bank",
          accountNumber: "001234",
          branch: "Dhaka",
          openingBalance: 100,
          active: true,
        })
      ).ok(),
    ).toBeTruthy();
    expect(
      (
        await save("accounts", {
          name: "Test Bank B",
          type: "Bank",
          openingBalance: 0,
          active: true,
        })
      ).ok(),
    ).toBeTruthy();
    const accounts = (await read()).accounts;
    const a = accounts.find((a: { name: string }) => a.name === "Test Bank A"),
      b = accounts.find((a: { name: string }) => a.name === "Test Bank B");
    const expense = {
      title: "Bank expense",
      type: "expense",
      amount: 1,
      date: "2026-09-26",
      account: b.id,
      categoryId,
    };
    expect((await save("transactions", expense)).status()).toBe(400);
    const transfer = {
      fromAccountId: a.id,
      toAccountId: b.id,
      amount: 60,
      date: "2026-09-26",
      note: "Bank funding",
    };
    expect(
      (await save("transfers", { ...transfer, amount: 101 })).status(),
    ).toBe(400);
    expect(
      (await save("transfers", { ...transfer, toAccountId: a.id })).status(),
    ).toBe(400);
    expect((await save("transfers", transfer)).ok()).toBeTruthy();
    let data = await read();
    const t = data.transfers.find(
      (t: { note: string }) => t.note === "Bank funding",
    );
    expect(
      data.accounts.find((x: { id: string }) => x.id === a.id).balance,
    ).toBe(40);
    expect(
      data.accounts.find((x: { id: string }) => x.id === b.id).balance,
    ).toBe(60);
    expect(data.transactions.length).toBe(initial.transactions.length);
    expect(
      (await save("transfers", { ...transfer, amount: 50 }, t.id)).ok(),
    ).toBeTruthy();
    const attempts = await Promise.all([
      save("transactions", { ...expense, amount: 40, title: "Concurrent A" }),
      save("transactions", { ...expense, amount: 40, title: "Concurrent B" }),
    ]);
    expect(attempts.filter((r) => r.ok())).toHaveLength(1);
    data = await read();
    expect(
      data.accounts.find((x: { id: string }) => x.id === b.id).balance,
    ).toBe(10);
    expect((await remove("transfers", t.id)).status()).toBe(400);
    expect(
      (await save("transfers", { ...transfer, amount: 20 }, t.id)).status(),
    ).toBe(400);
    const spent = data.transactions.find(
      (x: { account: string }) => x.account === b.id,
    );
    expect(
      (
        await save("transactions", { ...expense, amount: 70 }, spent.id)
      ).status(),
    ).toBe(400);
    expect(
      (
        await save(
          "accounts",
          { name: a.name, type: "Bank", openingBalance: 0, active: true },
          a.id,
        )
      ).status(),
    ).toBe(400);
    expect((await remove("accounts", a.id)).status()).toBe(400);
    expect((await remove("transactions", spent.id)).ok()).toBeTruthy();
    expect((await remove("transfers", t.id)).ok()).toBeTruthy();
    expect(
      (
        await save(
          "accounts",
          {
            name: "Renamed Bank B",
            type: "Bank",
            openingBalance: 0,
            active: false,
          },
          b.id,
        )
      ).ok(),
    ).toBeTruthy();
    expect((await save("transfers", transfer)).status()).toBe(400);
    expect((await remove("accounts", b.id)).ok()).toBeTruthy();
    expect((await remove("accounts", "Cash")).status()).toBe(400);
    // Both directions between Cash and Bank retain total funds.
    expect(
      (
        await save("transfers", {
          ...transfer,
          fromAccountId: "Cash",
          toAccountId: a.id,
          amount: 10,
          note: "Cash deposit",
        })
      ).ok(),
    ).toBeTruthy();
    expect(
      (
        await save("transfers", {
          ...transfer,
          fromAccountId: a.id,
          toAccountId: "Cash",
          amount: 10,
          note: "Cash withdrawal",
        })
      ).ok(),
    ).toBeTruthy();
    expect(
      (await read()).accounts.find((x: { id: string }) => x.id === a.id)
        .balance,
    ).toBe(100);
  } finally {
    await owner.dispose();
  }
});

test("account forms and cash transfer work in the browser", async ({
  page,
}) => {
  await page.goto("/demo");
  await page
    .getByRole("button", { name: "Cash & Bank accounts", exact: true })
    .click();
  await page.getByRole("button", { name: "Add new", exact: true }).click();
  await page.getByLabel("Account name", { exact: true }).fill("Browser Bank");
  await page
    .getByLabel("Bank / provider name", { exact: true })
    .fill("Example Bank");
  await page.getByLabel("Account number", { exact: true }).fill("00012345");
  await page.getByLabel("Opening balance", { exact: true }).fill("500");
  await page.getByRole("button", { name: "Save account", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Browser Bank", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Transfers", exact: true }).click();
  await page.getByRole("button", { name: "Add new", exact: true }).click();
  await page.getByLabel("From account", { exact: true }).selectOption("Cash");
  await page
    .getByLabel("To account", { exact: true })
    .selectOption({ label: "Browser Bank" });
  await page.getByLabel("Amount", { exact: true }).fill("900000");
  await page
    .getByRole("button", { name: "Save transfer", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Insufficient balance",
  );
  await page.getByLabel("Amount", { exact: true }).fill("50");
  await page
    .getByRole("button", { name: "Save transfer", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("row").filter({ hasText: "Browser Bank" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cash & Bank accounts", exact: true })
    .click();
  await expect(
    page.locator(".account-card").filter({ hasText: "Browser Bank" }),
  ).toContainText("550");
  await page.screenshot({
    path: "test-results/accounts-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});

test("income and expense permissions are enforced independently on the server", async ({
  playwright,
}) => {
  const owner = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  const clerk = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  try {
    await owner.post("/api/auth", {
      data: { action: "login", ...credentials },
    });
    const save = (collection: string, values: object, id?: string) =>
      owner.post("/api/data", {
        data: { collection, action: "save", values, id },
      });
    const initial = await (await owner.get("/api/data")).json();
    const incomeCategory = initial.categories.find(
      (c: { type: string }) => c.type === "income",
    ).id;
    const expenseCategory = initial.categories.find(
      (c: { type: string }) => c.type === "expense",
    ).id;
    const perms = ["read", "create", "update", "delete"].map(
      (a) => "income." + a,
    );
    expect(
      (await save("roles", { name: "Income clerk", permissions: perms })).ok(),
    ).toBeTruthy();
    const role = (await (await owner.get("/api/data")).json()).roles.find(
      (r: { name: string }) => r.name === "Income clerk",
    );
    expect(
      (
        await save("users", {
          name: "Clerk",
          email: "clerk@test.invalid",
          password: "Clerk-password-123",
          roleId: role.id,
        })
      ).ok(),
    ).toBeTruthy();
    expect(
      (
        await clerk.post("/api/auth", {
          data: {
            action: "login",
            email: "clerk@test.invalid",
            password: "Clerk-password-123",
          },
        })
      ).ok(),
    ).toBeTruthy();
    const income = {
      title: "Clerk income",
      type: "income",
      amount: 10,
      date: "2026-09-27",
      account: "Cash",
      categoryId: incomeCategory,
    };
    const expense = {
      ...income,
      title: "Clerk expense",
      type: "expense",
      categoryId: expenseCategory,
    };
    const write = (values: object, id?: string) =>
      clerk.post("/api/data", {
        data: { collection: "transactions", action: "save", values, id },
      });
    expect((await write(income)).ok()).toBeTruthy();
    expect((await write(expense)).status()).toBe(403);
    let data = await (await clerk.get("/api/data")).json();
    expect(
      data.transactions.every((t: { type: string }) => t.type === "income"),
    ).toBeTruthy();
    const created = data.transactions.find(
      (t: { title: string }) => t.title === income.title,
    );
    expect((await write(expense, created.id)).status()).toBe(403);
    const oldExpense = initial.transactions.find(
      (t: { type: string }) => t.type === "expense",
    );
    expect(
      (
        await clerk.post("/api/data", {
          data: {
            collection: "transactions",
            action: "delete",
            id: oldExpense.id,
          },
        })
      ).status(),
    ).toBe(403);
    expect((await write(income, oldExpense.id)).status()).toBe(403);
    await save(
      "roles",
      {
        name: role.name,
        permissions: ["read", "create", "update", "delete"].map(
          (a) => "expense." + a,
        ),
      },
      role.id,
    );
    data = await (await clerk.get("/api/data")).json();
    expect(
      data.transactions.every((t: { type: string }) => t.type === "expense"),
    ).toBeTruthy();
    expect((await write(income)).status()).toBe(403);
    expect((await write(expense)).ok()).toBeTruthy();
    expect(
      (
        await clerk.post("/api/data", {
          data: {
            collection: "transactions",
            action: "delete",
            id: created.id,
          },
        })
      ).status(),
    ).toBe(403);
  } finally {
    await owner.dispose();
    await clerk.dispose();
  }
});

test("all permission controls, bulk selection and restricted navigation", async ({
  page,
}) => {
  await page.goto("/demo");
  await page
    .getByRole("button", { name: "Roles & permissions", exact: true })
    .click();
  await page.getByRole("button", { name: "Add new", exact: true }).click();
  await expect(page.getByRole("checkbox")).toHaveCount(40);
  await page.getByRole("button", { name: "Select all", exact: true }).click();
  await expect(page.locator('input[name="permissions"]:checked')).toHaveCount(
    40,
  );
  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  await expect(page.locator('input[name="permissions"]:checked')).toHaveCount(
    0,
  );
  for (const name of ["Income: View", "Income: Create"])
    await page.getByRole("checkbox", { name, exact: true }).check();
  await page.getByLabel("Role name", { exact: true }).fill("Income only");
  await page.getByRole("button", { name: "Save role", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("gazi-family-demo-v1")!);
    const r = d.roles.find((r: { name: string }) => r.name === "Income only");
    d.users.find((u: { id: string }) => u.id === d.currentUserId).roleId = r.id;
    localStorage.setItem("gazi-family-demo-v1", JSON.stringify(d));
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Income", exact: true }),
  ).toBeVisible();
  for (const name of ["Overview", "Expenses", "Reports", "Roles & permissions"])
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(
      0,
    );
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Expense", exact: true }),
  ).toBeDisabled();
});
