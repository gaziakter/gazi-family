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
  expect((await download).suggestedFilename()).toMatch(/gazi-family-.*\.pdf/);
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
