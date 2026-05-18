/**
 * Auth & RBAC E2E tests.
 * Tests login flow, role-based routing, admin user management.
 */
import { test, expect, type Page } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://124.221.48.52:3004";

test.describe("Login Flow", () => {
  test("shows login page when not authenticated", async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator(".login-form__title")).toContainText("金色年华");
    await expect(page.locator('input[placeholder="请输入用户名"]')).toBeVisible();
    await expect(page.locator('input[placeholder="请输入密码"]')).toBeVisible();
  });

  test("rejects wrong password", async ({ page }) => {
    await page.goto(BASE);
    await page.locator('input[placeholder="请输入用户名"]').fill("admin");
    await page.locator('input[placeholder="请输入密码"]').fill("wrongpassword");
    await page.locator(".login-form__submit").click();
    await expect(page.locator(".login-form__error")).toContainText("密码");
  });

  test("org_admin logs in and sees quality page", async ({ page }) => {
    await page.goto(BASE);
    await page.locator('input[placeholder="请输入用户名"]').fill("admin");
    await page.locator('input[placeholder="请输入密码"]').fill("admin123");
    await page.locator(".login-form__submit").click();

    // org_admin default page is now quality management
    await expect(page.locator("text=质量总览").first()).toBeVisible({ timeout: 10000 });
  });

  test("site_operator logs in and sees site operations", async ({ page }) => {
    await page.goto(BASE);
    await page.locator('input[placeholder="请输入用户名"]').fill("operator");
    await page.locator('input[placeholder="请输入密码"]').fill("oper123");
    await page.locator(".login-form__submit").click();

    // Should see site operations page
    await expect(page.locator("text=Lumii 站点运营助手")).toBeVisible({ timeout: 10000 });
  });

  test("logout returns to login page", async ({ page }) => {
    // Login first
    await page.goto(BASE);
    await page.locator('input[placeholder="请输入用户名"]').fill("operator");
    await page.locator('input[placeholder="请输入密码"]').fill("oper123");
    await page.locator(".login-form__submit").click();
    await expect(page.locator("text=Lumii 站点运营助手")).toBeVisible({ timeout: 10000 });

    // Logout
    await page.locator(".so-shell__logout").click();
    await expect(page.locator(".login-form__title")).toContainText("金色年华", { timeout: 5000 });
  });
});

test.describe("Role-Based Access", () => {
  test("org_admin can access site operations via link", async ({ page }) => {
    await page.goto(BASE);
    await page.locator('input[placeholder="请输入用户名"]').fill("admin");
    await page.locator('input[placeholder="请输入密码"]').fill("admin123");
    await page.locator(".login-form__submit").click();
    await expect(page.locator("text=质量总览").first()).toBeVisible({ timeout: 10000 });

    // Click "进入站点运营" link
    await page.locator("text=进入站点运营").click();
    await expect(page.locator("text=Lumii 站点运营助手")).toBeVisible({ timeout: 10000 });
  });

  test("site_operator cannot access /admin", async ({ page }) => {
    await page.goto(BASE);
    await page.locator('input[placeholder="请输入用户名"]').fill("operator");
    await page.locator('input[placeholder="请输入密码"]').fill("oper123");
    await page.locator(".login-form__submit").click();
    await expect(page.locator("text=Lumii 站点运营助手")).toBeVisible({ timeout: 10000 });

    // Try to navigate to /admin
    await page.goto(`${BASE}/admin`);
    await expect(page.locator("text=403")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Admin User Management", () => {
  test("admin can create and see user in list", async ({ page }) => {
    // Login as admin and navigate to /admin
    await page.goto(BASE);
    await page.locator('input[placeholder="请输入用户名"]').fill("admin");
    await page.locator('input[placeholder="请输入密码"]').fill("admin123");
    await page.locator(".login-form__submit").click();
    await expect(page.locator("text=质量总览").first()).toBeVisible({ timeout: 10000 });
    await page.goto(`${BASE}/admin`);
    await expect(page.locator(".admin-header")).toBeVisible({ timeout: 10000 });

    // Click "新增用户"
    await page.locator("text=新增用户").click();
    await expect(page.locator(".admin-form")).toBeVisible();

    // Fill form
    const uname = `e2e-user-${Date.now()}`;
    await page.locator('.admin-form__grid input').first().fill(uname);
    await page.locator('.admin-form__grid input[type="password"]').fill("testpass123");
    await page.locator('.admin-form__grid input').nth(2).fill("E2E测试用户");

    // Submit
    await page.locator(".admin-form .admin-btn--primary").click();

    // Verify user appears in table
    await expect(page.locator(`.admin-table td code:text("${uname}")`)).toBeVisible({ timeout: 5000 });
  });
});
