import { test, expect } from "@playwright/test";

test("builder renders toolbar and canvas", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Export YAML")).toBeVisible();
  await expect(page.getByText("Copy YAML")).toBeVisible();
  await expect(page.locator(".react-flow")).toBeVisible();
});

test("canvas loads checks.yaml on startup", async ({ page }) => {
  await page.goto("/");
  // Wait for the async fetch + render of checks.yaml
  await expect(page.locator(".react-flow__node").first()).toBeVisible({ timeout: 6000 });
  const nodeCount = await page.locator(".react-flow__node").count();
  expect(nodeCount).toBeGreaterThan(0);
});

test("check nodes show automated badge, not red failure badge", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".react-flow__node").first()).toBeVisible({ timeout: 6000 });
  await expect(page.getByText("automated").first()).toBeVisible();
  await expect(page.getByText("blocks on failure")).not.toBeVisible();
});

test("prompt check nodes show agent prompt badge", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".react-flow__node").first()).toBeVisible({ timeout: 6000 });
  await expect(page.getByText("agent prompt").first()).toBeVisible();
});

test("clicking a check node opens side panel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator(".react-flow__node").first()).toBeVisible({ timeout: 6000 });
  // Wait for fitView animation (duration: 400ms) to finish
  await page.waitForTimeout(600);

  // Click the first check node whose top edge is below the toolbar (~104px)
  const checkNodes = page.locator(".react-flow__node-check-deterministic");
  const count = await checkNodes.count();
  let clicked = false;
  for (let i = 0; i < count; i++) {
    const box = await checkNodes.nth(i).boundingBox();
    if (box && box.y > 110) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      clicked = true;
      break;
    }
  }
  expect(clicked).toBe(true);
  await expect(page.getByText(/check deterministic properties/i)).toBeVisible({ timeout: 3000 });
});
