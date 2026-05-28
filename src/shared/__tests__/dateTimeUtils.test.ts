import { describe, it, expect } from "vitest";
import { formatDateWithDay, formatDateShort, formatSyncTime, formatTime, toBjStr, formatWindow } from "../utils/dateTimeUtils";

describe("formatDateWithDay", () => {
  it("formats date with Chinese day-of-week", () => {
    const result = formatDateWithDay("2026-05-28");
    expect(result).toMatch(/5\/28/);
    expect(result).toMatch(/周/);
  });
  it("returns raw string for invalid date", () => {
    expect(formatDateWithDay("not-a-date")).toBe("not-a-date");
  });
});

describe("formatDateShort", () => {
  it("formats as M/D", () => {
    expect(formatDateShort("2026-05-28")).toBe("5/28");
  });
  it("returns raw string for invalid date", () => {
    expect(formatDateShort("bad")).toBe("bad");
  });
});

describe("formatSyncTime", () => {
  it("returns empty string for undefined", () => {
    expect(formatSyncTime(undefined)).toBe("");
    expect(formatSyncTime("")).toBe("");
  });
  it("formats ISO string to zh-CN locale", () => {
    const result = formatSyncTime("2026-05-28T14:30:00Z");
    expect(result).toBeTruthy();
    expect(result).not.toBe("2026-05-28T14:30:00Z");
  });
  it("returns raw string for invalid ISO", () => {
    expect(formatSyncTime("not-a-date")).toBe("not-a-date");
  });
});

describe("formatTime", () => {
  it("returns empty string for undefined", () => {
    expect(formatTime(undefined)).toBe("");
  });
  it("formats ISO string with Asia/Shanghai timezone", () => {
    const result = formatTime("2026-05-28T06:30:00Z");
    expect(result).toBeTruthy();
  });
  it("returns raw string for invalid ISO", () => {
    expect(formatTime("not-a-date")).toBe("not-a-date");
  });
});

describe("toBjStr", () => {
  it("returns date, time, and full strings in Beijing time", () => {
    const d = new Date("2026-05-28T06:30:00Z");
    const result = toBjStr(d);
    expect(result.date).toBe("5/28");
    expect(result.time).toBe("14:30");
    expect(result.full).toMatch(/2026-05-28 14:30/);
  });
});

describe("formatWindow", () => {
  it("returns timeWindow label if available", () => {
    expect(formatWindow({ timeWindow: { label: "上午" } })).toBe("上午");
  });
  it("returns start-end range from timeWindow", () => {
    expect(formatWindow({ timeWindow: { start: "09:00", end: "12:00" } })).toBe("09:00-12:00");
  });
  it("falls back to startTime/endTime", () => {
    expect(formatWindow({ startTime: "14:00", endTime: "17:00" })).toBe("14:00-17:00");
  });
  it("handles missing values", () => {
    expect(formatWindow({})).toBe("-");
  });
});
