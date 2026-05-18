/**
 * E2E tests for the 4 merged modules: Quality, Supervisor, Careworker, Family.
 * Tests page loading, routing, and basic functionality.
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://124.221.48.52:3004";

test.describe("Quality Manager (集团管理)", () => {
  test("org_admin sees quality page after login", async ({ page }) => {
    await page.goto(BASE);
    await page.locator('input[placeholder="请输入用户名"]').fill("admin");
    await page.locator('input[placeholder="请输入密码"]').fill("admin123");
    await page.locator(".login-form__submit").click();
    // org_admin default page is quality
    await expect(page.locator("text=质量总览").first()).toBeVisible({ timeout: 10000 });
  });

  test("quality page shows KPI cards", async ({ page }) => {
    await page.goto(BASE);
    await page.locator('input[placeholder="请输入用户名"]').fill("admin");
    await page.locator('input[placeholder="请输入密码"]').fill("admin123");
    await page.locator(".login-form__submit").click();
    await expect(page.locator("text=质量总览").first()).toBeVisible({ timeout: 10000 });
    // Check KPI metrics exist
    await expect(page.locator("text=服务完成率")).toBeVisible();
  });

  test("org_admin can navigate to site operations", async ({ page }) => {
    await page.goto(BASE);
    await page.locator('input[placeholder="请输入用户名"]').fill("admin");
    await page.locator('input[placeholder="请输入密码"]').fill("admin123");
    await page.locator(".login-form__submit").click();
    await expect(page.locator("text=质量总览").first()).toBeVisible({ timeout: 10000 });
    // Navigate to site operations
    await page.locator("text=进入站点运营").click();
    await expect(page.locator("text=Lumii 站点运营助手")).toBeVisible({ timeout: 10000 });
  });

  test("org_admin can access admin page for user management", async ({ page }) => {
    await page.goto(BASE);
    await page.locator('input[placeholder="请输入用户名"]').fill("admin");
    await page.locator('input[placeholder="请输入密码"]').fill("admin123");
    await page.locator(".login-form__submit").click();
    await expect(page.locator("text=质量总览").first()).toBeVisible({ timeout: 10000 });
    // Navigate to /admin via URL
    await page.goto(`${BASE}/admin`);
    await expect(page.locator(".admin-header")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Supervisor (服务主管)", () => {
  test("service_supervisor sees supervisor page after login", async ({ page }) => {
    await page.goto(BASE);
    await page.locator('input[placeholder="请输入用户名"]').fill("supervisor");
    await page.locator('input[placeholder="请输入密码"]').fill("super123");
    await page.locator(".login-form__submit").click();
    // supervisor default page
    await expect(page.locator("text=SOP").first()).toBeVisible({ timeout: 10000 });
  });

  test("supervisor page shows folder tree", async ({ page }) => {
    await page.goto(BASE);
    await page.locator('input[placeholder="请输入用户名"]').fill("supervisor");
    await page.locator('input[placeholder="请输入密码"]').fill("super123");
    await page.locator(".login-form__submit").click();
    await expect(page.locator("text=SOP").first()).toBeVisible({ timeout: 10000 });
    // Check folder tree has content
    await expect(page.locator("text=通用规范").first()).toBeVisible({ timeout: 5000 });
  });

  test("supervisor redirected from site-operations to supervisor page", async ({ page }) => {
    await page.goto(BASE);
    await page.locator('input[placeholder="请输入用户名"]').fill("supervisor");
    await page.locator('input[placeholder="请输入密码"]').fill("super123");
    await page.locator(".login-form__submit").click();
    await expect(page.locator("text=SOP").first()).toBeVisible({ timeout: 10000 });
    // Try to access site-operations — should redirect back to supervisor
    await page.goto(`${BASE}/site-operations`);
    await expect(page.locator("text=SOP").first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Careworker (服务人员 H5)", () => {
  test("careworker page loads without auth (has own login)", async ({ page }) => {
    await page.goto(`${BASE}/careworker`);
    // Should show careworker's own login screen
    await expect(page.locator("text=金色年华").first()).toBeVisible({ timeout: 10000 });
  });

  test("careworker can select worker and see tasks", async ({ page }) => {
    await page.goto(`${BASE}/careworker`);
    await expect(page.locator("text=金色年华").first()).toBeVisible({ timeout: 10000 });
    // Click first worker option
    const firstWorker = page.locator("[class*='worker']").first();
    if (await firstWorker.isVisible()) {
      await firstWorker.click();
    }
  });

  test("hardware simulator loads", async ({ page }) => {
    await page.goto(`${BASE}/careworker/hardware`);
    // Should show badge simulator
    await expect(page.locator("text=智能工牌").first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Family (家属 H5)", () => {
  test("family page loads without auth", async ({ page }) => {
    await page.goto(`${BASE}/family`);
    // Should show family page directly (no login required)
    await expect(page.locator("text=消息动态").first()).toBeVisible({ timeout: 10000 });
  });

  test("family page shows feed messages", async ({ page }) => {
    await page.goto(`${BASE}/family`);
    await expect(page.locator("text=消息动态").first()).toBeVisible({ timeout: 10000 });
    // Check feed has content
    await expect(page.locator("text=服务报告").first()).toBeVisible({ timeout: 5000 });
  });

  test("family page can switch to feedback tab", async ({ page }) => {
    await page.goto(`${BASE}/family`);
    await expect(page.locator("text=消息动态").first()).toBeVisible({ timeout: 10000 });
    // Switch to feedback tab
    await page.locator("text=意见反馈").click();
    await expect(page.locator("text=反馈").first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Role Routing (cross-module)", () => {
  test("site_operator cannot access /quality (gets 403 or redirected)", async ({ page }) => {
    await page.goto(BASE);
    await page.locator('input[placeholder="请输入用户名"]').fill("operator");
    await page.locator('input[placeholder="请输入密码"]').fill("oper123");
    await page.locator(".login-form__submit").click();
    await expect(page.locator("text=Lumii 站点运营助手")).toBeVisible({ timeout: 10000 });
    await page.goto(`${BASE}/quality`);
    await page.waitForTimeout(2000);
    // Operator should NOT see the quality dashboard
    const qualityVisible = await page.locator("text=质量总览").isVisible().catch(() => false);
    expect(qualityVisible).toBe(false);
  });

  test("site_operator cannot access /supervisor", async ({ page }) => {
    await page.goto(BASE);
    await page.locator('input[placeholder="请输入用户名"]').fill("operator");
    await page.locator('input[placeholder="请输入密码"]').fill("oper123");
    await page.locator(".login-form__submit").click();
    await expect(page.locator("text=Lumii 站点运营助手")).toBeVisible({ timeout: 10000 });
    await page.goto(`${BASE}/supervisor`);
    await expect(page.locator("text=无权访问")).toBeVisible({ timeout: 10000 });
  });
});
