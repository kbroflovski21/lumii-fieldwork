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

    // Logout via sidebar avatar menu
    await page.locator(".so-shell__avatar").click();
    await page.locator(".so-shell__profile-menu button:last-child").click();
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

    // Try to navigate to /admin — should show 403/无权访问 or redirect back
    await page.goto(`${BASE}/admin`);
    await page.waitForTimeout(2000);
    const url = page.url();
    const text = await page.textContent("body") ?? "";
    expect(text.includes("403") || text.includes("无权访问") || url.includes("site-operations") || text.includes("站点运营")).toBe(true);
  });
});

test.describe("Admin User Management", () => {
  test("admin can create and see user in list", async ({ page }) => {
    await page.goto(BASE);
    await page.locator('input[placeholder="请输入用户名"]').fill("admin");
    await page.locator('input[placeholder="请输入密码"]').fill("admin123");
    await page.locator(".login-form__submit").click();
    await expect(page.locator("text=质量总览").first()).toBeVisible({ timeout: 10000 });

    // Go to user management tab
    await page.locator("button[title=用户管理]").click();
    await expect(page.locator("text=用户管理").first()).toBeVisible({ timeout: 5000 });

    // Click "新增用户"
    await page.locator(".quality-users__add-btn").click();
    await expect(page.locator(".quality-user-modal")).toBeVisible({ timeout: 5000 });

    // Fill form in the modal
    const uname = `e2e-user-${Date.now()}`;
    await page.locator(".sw-field input").first().fill(uname);
    await page.locator('.sw-field input[type="password"]').fill("testpass123");
    await page.locator(".sw-field input").nth(2).fill("E2E测试用户");

    // Submit
    await page.locator(".sw-btn--primary").last().click();
    await page.waitForTimeout(1000);

    // Verify user appears in table
    await expect(page.locator(`a.quality-users__link:has-text("${uname}")`)).toBeVisible({ timeout: 5000 });
  });
});
