import { describe, it, expect } from "vitest";
import { PATH_TO_AREA, GY_AREA_TO_PATH, pathToArea } from "../../src/router";

describe("PATH_TO_AREA", () => {
  it("maps / to home", () => expect(PATH_TO_AREA["/"]).toBe("home"));
  it("maps /workers to social_workers", () => expect(PATH_TO_AREA["/workers"]).toBe("social_workers"));
  it("maps /badges to smart_badges", () => expect(PATH_TO_AREA["/badges"]).toBe("smart_badges"));
  it("maps /elders to service_objects", () => expect(PATH_TO_AREA["/elders"]).toBe("service_objects"));
  it("maps /schedules to service_schedules", () => expect(PATH_TO_AREA["/schedules"]).toBe("service_schedules"));
  it("maps /records to service_records", () => expect(PATH_TO_AREA["/records"]).toBe("service_records"));
});

describe("GY_AREA_TO_PATH", () => {
  it("maps social_workers to /workers", () => expect(GY_AREA_TO_PATH["social_workers"]).toBe("/workers"));
  it("maps service_objects to /elders", () => expect(GY_AREA_TO_PATH["service_objects"]).toBe("/elders"));
  it("maps dashboard to /admin", () => expect(GY_AREA_TO_PATH["dashboard"]).toBe("/admin"));
  it("maps home to /", () => expect(GY_AREA_TO_PATH["home"]).toBe("/"));
  it("maps service_schedules to /schedules", () => expect(GY_AREA_TO_PATH["service_schedules"]).toBe("/schedules"));
  it("maps service_records to /records", () => expect(GY_AREA_TO_PATH["service_records"]).toBe("/records"));
  it("maps smart_badges to /badges", () => expect(GY_AREA_TO_PATH["smart_badges"]).toBe("/badges"));
});

describe("pathToArea", () => {
  it("returns home for /", () => expect(pathToArea("/")).toBe("home"));
  it("returns social_workers for /workers", () => expect(pathToArea("/workers")).toBe("social_workers"));
  it("returns social_workers for /workers/123", () => expect(pathToArea("/workers/123")).toBe("social_workers"));
  it("returns service_objects for /elders/new", () => expect(pathToArea("/elders/new")).toBe("service_objects"));
  it("returns service_records for /records/abc", () => expect(pathToArea("/records/abc")).toBe("service_records"));
  it("returns home for unknown paths", () => expect(pathToArea("/unknown")).toBe("home"));
});
