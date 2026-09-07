import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("public entry, private routes and explicit demo stay separate", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Let’s grow something good." }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Explore a sample garden", exact: true })
    .click();
  await expect(page).toHaveURL(/\/demo$/);
  await page.goto("/designer?garden=test-garden&bed=test-bed");
  await expect(page).toHaveURL(/\/auth\?redirectTo=/);
  expect(new URL(page.url()).searchParams.get("redirectTo")).toBe(
    "/designer?garden=test-garden&bed=test-bed",
  );
  await page.getByLabel("Email", { exact: true }).fill("test@example.com");
  await page.getByLabel("Password", { exact: true }).fill("sample-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Account connection" }),
  ).toContainText("not configured");
  const missing = await page.goto("/demo/not-a-page");
  // Next.js can stream the loading boundary before resolving notFound().
  expect([200, 404]).toContain(missing?.status());
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
    "content",
    "noindex",
  );
});

test("search, filters, plant dialog and keyboard dismissal work", async ({
  page,
}) => {
  await page.goto("/demo/plants?q=basil");
  await expect(page.getByLabel("Search plants", { exact: true })).toHaveValue(
    "basil",
  );
  await expect(page.locator(".plant-card")).toHaveCount(1);
  await page.locator(".plant-card").click();
  await expect(page.getByRole("dialog")).toContainText("Sweet basil");
  await expect(page.getByRole("dialog")).toContainText("12 inches");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByLabel("Search plants", { exact: true }).fill("");
  await page
    .getByRole("button", { name: "Quick harvests", exact: true })
    .click();
  await expect(page.locator(".plant-card")).toHaveCount(3);
  await page.getByLabel("Search plants", { exact: true }).fill("no-such-seed");
  await expect(page.getByText("Nothing growing here just yet.")).toBeVisible();
});

test("task completion and reopening survive navigation and reload", async ({
  page,
}) => {
  await page.goto("/demo");
  await page
    .getByRole("checkbox", {
      name: "Complete water cherry tomatoes",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("link", { name: "02 Tasks ready for a little love" }),
  ).toBeVisible();
  await page.goto("/demo/tasks");
  await page.getByRole("button", { name: /Completed/ }).click();
  await expect(
    page.getByRole("checkbox", { name: "Reopen water cherry tomatoes" }),
  ).toBeChecked();
  await page.reload();
  await page.getByRole("button", { name: /Completed/ }).click();
  await page
    .getByRole("checkbox", { name: "Reopen water cherry tomatoes" })
    .click();
  await page.goto("/demo");
  await expect(
    page.getByRole("link", { name: "03 Tasks ready for a little love" }),
  ).toBeVisible();
});

test("garden creation, accessible bed additions and save survive reload", async ({
  page,
}) => {
  await page.goto("/demo/gardens");
  await page.getByRole("button", { name: "New garden" }).click();
  await page.getByLabel("Garden name").fill("Weekend greens");
  await page.getByRole("button", { name: "Create my garden" }).click();
  await page.getByRole("link", { name: "Open Weekend greens" }).click();
  await page
    .getByRole("button", { name: "Add Sweet basil to bed", exact: true })
    .click();
  await expect(page.getByText("1 plant placed", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save bed", exact: true }).click();
  await expect(
    page.getByText("Sample bed saved in this browser."),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("1 plant placed", { exact: true })).toBeVisible();
  await page.goto("/demo/gardens");
  const card = page.getByRole("link", { name: "Open Weekend greens" });
  await expect(card).toContainText("1 bed");
  await expect(card).toContainText("1 plant");
  await card.click();
  await expect(page.getByText("1 plant placed", { exact: true })).toBeVisible();
});

test("calendar changes months, returns to today, and displays dated tasks", async ({
  page,
}) => {
  await page.goto("/demo/calendar");
  const current = await page.locator(".calendar-toolbar h2").innerText();
  await page.getByRole("button", { name: "Next month", exact: true }).click();
  await expect(page.locator(".calendar-toolbar h2")).not.toHaveText(current);
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.locator(".calendar-toolbar h2")).toHaveText(current);
  await expect(page.locator(".calendar-agenda")).toContainText(
    "Water cherry tomatoes",
  );
});

test("mobile navigation, every demo destination and layout fit a phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo");
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "My gardens", exact: true })
    .click();
  await expect(page).toHaveURL(/\/demo\/gardens$/);
  await expect(
    page.getByRole("button", { name: "Open navigation", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  for (const route of [
    "",
    "plants",
    "tasks",
    "calendar",
    "explore",
    "settings",
    "botanist",
    "designer",
  ]) {
    await page.goto(`/demo/${route}`);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      route,
    ).toBe(true);
    await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
  }
});

test("corrupted demo storage recovers without a blank screen", async ({
  page,
}) => {
  await page.goto("/demo");
  await page.evaluate(() =>
    localStorage.setItem("wegarden-demo-v1", "{broken"),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "A good day to grow, Alex." }),
  ).toBeVisible();
});

test("main dashboard has no automated accessibility violations", async ({
  page,
}) => {
  await page.goto("/demo");
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
});

test("garden deletion requires confirmation and persists", async ({ page }) => {
  await page.goto("/demo/gardens");
  await page
    .getByRole("button", { name: "Delete The kitchen garden", exact: true })
    .click();
  await page.getByRole("button", { name: "Keep garden", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Open The kitchen garden" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete The kitchen garden", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete garden", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Open The kitchen garden" }),
  ).toHaveCount(0);
  await page.goto("/demo/tasks");
  await expect(
    page.getByRole("checkbox", { name: "Complete water cherry tomatoes" }),
  ).toHaveCount(0);
});
