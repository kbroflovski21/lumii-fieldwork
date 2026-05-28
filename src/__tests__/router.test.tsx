import { describe, it, expect } from "vitest";
import { pathToArea, PATH_TO_AREA, GY_AREA_TO_PATH } from "../router";

describe("pathToArea", () => {
  it("returns home for /", () => {
    expect(pathToArea("/")).toBe("home");
  });

  it("returns social_workers for /workers", () => {
    expect(pathToArea("/workers")).toBe("social_workers");
  });

  it("returns social_workers for /workers/:id", () => {
    expect(pathToArea("/workers/w-001")).toBe("social_workers");
  });

  it("returns service_objects for /elders/:id", () => {
    expect(pathToArea("/elders/elder-001")).toBe("service_objects");
  });

  it("returns service_objects for /elders/new", () => {
    expect(pathToArea("/elders/new")).toBe("service_objects");
  });

  it("returns service_records for /records/:id", () => {
    expect(pathToArea("/records/rec-001")).toBe("service_records");
  });

  it("returns recordings for /recordings", () => {
    expect(pathToArea("/recordings")).toBe("recordings");
  });

  it("returns recordings for /recordings/:id", () => {
    expect(pathToArea("/recordings/rec-001")).toBe("recordings");
  });

  it("returns home for unknown paths", () => {
    expect(pathToArea("/unknown")).toBe("home");
  });
});

describe("PATH_TO_AREA mapping", () => {
  it("has entries for all site operations areas including recordings", () => {
    expect(PATH_TO_AREA["/"]).toBe("home");
    expect(PATH_TO_AREA["/workers"]).toBe("social_workers");
    expect(PATH_TO_AREA["/badges"]).toBe("smart_badges");
    expect(PATH_TO_AREA["/elders"]).toBe("service_objects");
    expect(PATH_TO_AREA["/schedules"]).toBe("service_schedules");
    expect(PATH_TO_AREA["/records"]).toBe("service_records");
    expect(PATH_TO_AREA["/recordings"]).toBe("recordings");
  });
});

describe("GY_AREA_TO_PATH mapping", () => {
  it("has entries for all areas including admin and recordings", () => {
    expect(GY_AREA_TO_PATH["home"]).toBe("/");
    expect(GY_AREA_TO_PATH["social_workers"]).toBe("/workers");
    expect(GY_AREA_TO_PATH["smart_badges"]).toBe("/badges");
    expect(GY_AREA_TO_PATH["service_objects"]).toBe("/elders");
    expect(GY_AREA_TO_PATH["service_schedules"]).toBe("/schedules");
    expect(GY_AREA_TO_PATH["service_records"]).toBe("/records");
    expect(GY_AREA_TO_PATH["recordings"]).toBe("/recordings");
    expect(GY_AREA_TO_PATH["dashboard"]).toBe("/admin");
    expect(GY_AREA_TO_PATH["sites"]).toBe("/admin/sites");
    expect(GY_AREA_TO_PATH["users"]).toBe("/admin/users");
    expect(GY_AREA_TO_PATH["sop"]).toBe("/admin/sop");
  });
});
