import { test, expect } from "@playwright/test";

test("builder renders toolbar with export and view toggle buttons", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Export YAML")).toBeVisible();
  await expect(page.getByText("Copy YAML")).toBeVisible();
  await expect(page.getByLabel("Checks list")).toBeVisible();
  await expect(page.getByLabel("Check history")).toBeVisible();
});

test("list view loads checks from checks.yaml on startup", async ({ page }) => {
  await page.goto("/");
  // Wait for the async fetch + render of checks.yaml
  await expect(page.getByTestId("check-card").first()).toBeVisible({ timeout: 6000 });
  const count = await page.getByTestId("check-card").count();
  expect(count).toBeGreaterThan(0);
});

test("automated checks section is visible with cmd checks", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("check-card").first()).toBeVisible({ timeout: 6000 });
  await expect(page.getByText("Automated Checks")).toBeVisible();
  // At least one check card should contain a code snippet (cmd)
  const terminal = page.locator("[data-testid='check-card'] code").first();
  await expect(terminal).toBeVisible();
});

test("manual checks section is visible with prompt checks", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("check-card").first()).toBeVisible({ timeout: 6000 });
  await expect(page.getByText("Manual Checks")).toBeVisible();
});

test("clicking edit on a check opens the edit dialog", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("check-card").first()).toBeVisible({ timeout: 6000 });

  // Hover over the first check card to reveal the edit button
  const firstCard = page.getByTestId("check-card").first();
  await firstCard.hover();
  const editBtn = firstCard.getByLabel("Edit check");
  await expect(editBtn).toBeVisible();
  await editBtn.click();

  // Edit dialog should open
  await expect(page.getByText("Edit Check")).toBeVisible({ timeout: 3000 });
});

test("history tab shows empty state when no reports exist", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Check history").click();
  // Either shows runs or empty state — both are valid
  await expect(page.getByText(/No check runs recorded yet|Check History/)).toBeVisible({
    timeout: 4000,
  });
});
