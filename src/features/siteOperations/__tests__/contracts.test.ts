import { describe, expect, it } from "vitest";
import { statusText, workAreas } from "../contracts";

describe("site operations contracts", () => {
  it("keeps the latest approved work areas in order", () => {
    expect(workAreas.map((area) => area.id)).toEqual([
      "home",
      "social_workers",
      "smart_badges",
      "service_objects",
      "service_schedules",
      "service_records"
    ]);
    expect(workAreas.map((area) => area.label)).toEqual(["首页", "服务人员", "设备", "服务对象", "服务排期", "服务记录"]);
  });

  it("labels lifecycle, schedule, review, export, permission, and subscription states", () => {
    expect(statusText.pending_activation).toBe("待激活");
    expect(statusText.available).toBe("可用");
    expect(statusText.in_use).toBe("使用中");
    expect(statusText.sync_delayed).toBe("同步延迟");
    expect(statusText.unassigned).toBe("待分配");
    expect(statusText.scheduled).toBe("待执行");
    expect(statusText.info_incomplete).toBe("信息不完整");
    expect(statusText.exception_open).toBe("异常未闭环");
    expect(statusText.exported_with_flags).toBe("带标记导出");
    expect(statusText.restricted).toBe("权限受限");
    expect(statusText.weekly).toBe("周报");
  });
});
