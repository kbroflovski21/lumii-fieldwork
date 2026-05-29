import { describe, it, expect } from "vitest";

// Test the context formatting logic extracted from the layouts
// (The actual sendWithContext is a useCallback inside Layout components,
// so we test the formatting logic it implements)

function formatContext(
  areaLabel: string,
  detailEntity: { entityType: string; entityId: string; entityName: string } | null,
  content: string,
): string {
  if (detailEntity) {
    return `[ctx:${areaLabel}/${detailEntity.entityName}/${detailEntity.entityId}] ${content}`;
  }
  return `[ctx:${areaLabel}] ${content}`;
}

describe("sendWithContext formatting", () => {
  it("formats list page context (no entity)", () => {
    const result = formatContext("服务人员", null, "在职人数有多少");
    expect(result).toBe("[ctx:服务人员] 在职人数有多少");
  });

  it("formats detail page context (with entity)", () => {
    const result = formatContext("服务人员", {
      entityType: "social_worker",
      entityId: "worker-001",
      entityName: "王丽",
    }, "修改电话为139xxx");
    expect(result).toBe("[ctx:服务人员/王丽/worker-001] 修改电话为139xxx");
  });

  it("formats admin detail page context", () => {
    const result = formatContext("站点管理", {
      entityType: "site",
      entityId: "site-001",
      entityName: "翠苑站",
    }, "更新联系人信息");
    expect(result).toBe("[ctx:站点管理/翠苑站/site-001] 更新联系人信息");
  });

  it("handles entity name with special characters", () => {
    const result = formatContext("长者", {
      entityType: "service_object",
      entityId: "elder-001",
      entityName: "张大爷（独居）",
    }, "查看服务计划");
    expect(result).toBe("[ctx:长者/张大爷（独居）/elder-001] 查看服务计划");
  });
});
