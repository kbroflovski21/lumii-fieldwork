import { describe, it, expect } from "vitest";
import { stripRefreshMarker } from "../../features/siteOperations/useAgentChat";

describe("stripRefreshMarker", () => {
  it("strips [gy:refresh] and returns shouldRefresh true", () => {
    const input = "✅ 服务人员已更新\n姓名: 张三\n变更内容: 电话\n[gy:refresh]";
    const result = stripRefreshMarker(input);
    expect(result.shouldRefresh).toBe(true);
    expect(result.content).toBe("✅ 服务人员已更新\n姓名: 张三\n变更内容: 电话");
  });

  it("strips [gy:refresh] with surrounding whitespace", () => {
    const input = "✅ 已更新\n\n[gy:refresh]\n";
    const result = stripRefreshMarker(input);
    expect(result.shouldRefresh).toBe(true);
    expect(result.content).toBe("✅ 已更新");
  });

  it("returns shouldRefresh false when no marker present", () => {
    const input = "查询结果：张三，在职";
    const result = stripRefreshMarker(input);
    expect(result.shouldRefresh).toBe(false);
    expect(result.content).toBe("查询结果：张三，在职");
  });

  it("handles empty string", () => {
    const result = stripRefreshMarker("");
    expect(result.shouldRefresh).toBe(false);
    expect(result.content).toBe("");
  });

  it("handles marker as the only content", () => {
    const result = stripRefreshMarker("[gy:refresh]");
    expect(result.shouldRefresh).toBe(true);
    expect(result.content).toBe("");
  });

  it("strips marker mid-content", () => {
    const input = "✅ 已更新\n[gy:refresh]\n额外信息";
    const result = stripRefreshMarker(input);
    expect(result.shouldRefresh).toBe(true);
    expect(result.content).toBe("✅ 已更新\n额外信息");
  });
});
