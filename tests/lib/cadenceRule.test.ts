import { describe, it, expect } from "vitest";
import { parseCadenceRule, generateDates } from "../../server/lib/cadenceRule";

describe("parseCadenceRule", () => {
  it("parses WEEKLY:1,3,5", () => {
    expect(parseCadenceRule("WEEKLY:1,3,5")).toEqual({ type: "weekly", days: [1, 3, 5] });
  });

  it("parses WEEKLY:1,2,3,4,5 (weekdays)", () => {
    expect(parseCadenceRule("WEEKLY:1,2,3,4,5")).toEqual({ type: "weekly", days: [1, 2, 3, 4, 5] });
  });

  it("returns null for empty string", () => {
    expect(parseCadenceRule("")).toBeNull();
  });

  it("returns null for invalid format", () => {
    expect(parseCadenceRule("DAILY:1")).toBeNull();
  });
});

describe("generateDates", () => {
  it("generates Mon/Wed/Fri dates for 4 weeks", () => {
    // 2026-05-25 is a Monday
    const dates = generateDates("WEEKLY:1,3,5", "2026-05-25", 28);
    expect(dates.length).toBe(12);
    expect(dates[0]).toBe("2026-05-25");
    expect(dates[1]).toBe("2026-05-27");
    expect(dates[2]).toBe("2026-05-29");
    expect(dates[3]).toBe("2026-06-01");
  });

  it("generates weekdays for 1 week", () => {
    const dates = generateDates("WEEKLY:1,2,3,4,5", "2026-05-25", 7);
    expect(dates.length).toBe(5);
    expect(dates[0]).toBe("2026-05-25");
    expect(dates[4]).toBe("2026-05-29");
  });

  it("returns empty for invalid rule", () => {
    expect(generateDates("", "2026-05-25", 28)).toEqual([]);
  });

  it("skips dates before startDate", () => {
    // Start on Wednesday 2026-05-27, rule is Mon/Wed/Fri — Wed, Fri, Mon
    const dates = generateDates("WEEKLY:1,3,5", "2026-05-27", 7);
    expect(dates[0]).toBe("2026-05-27");
    expect(dates[1]).toBe("2026-05-29");
    expect(dates[2]).toBe("2026-06-01");
    expect(dates.length).toBe(3);
  });

  it("handles single day rule", () => {
    const dates = generateDates("WEEKLY:2", "2026-05-25", 28);
    expect(dates.length).toBe(4);
    dates.forEach(d => expect(new Date(d + "T00:00:00").getDay()).toBe(2));
  });
});
