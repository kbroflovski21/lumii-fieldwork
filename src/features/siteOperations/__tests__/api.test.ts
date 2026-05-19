import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteOperationsApiError, siteOperationsApi } from "../api";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function mockJsonResponse(body: unknown = { ok: true }) {
  globalThis.fetch = vi.fn(async () => Response.json(body));
}

describe("siteOperationsApi", () => {
  it.each([
    ["getHome", () => siteOperationsApi.getHome(), "/api/site-operations/home"],
    ["getSocialWorkers", () => siteOperationsApi.getSocialWorkers(), "/api/social-workers"],
    ["getSmartBadges", () => siteOperationsApi.getSmartBadges(), "/api/smart-badges"],
    ["getSmartBadge", () => siteOperationsApi.getSmartBadge("badge-021"), "/api/smart-badges/badge-021"],
    [
      "getSmartBadgeServiceRecords",
      () => siteOperationsApi.getSmartBadgeServiceRecords("badge-021"),
      "/api/smart-badges/badge-021/service-records"
    ],
    ["getServiceObjects", () => siteOperationsApi.getServiceObjects(), "/api/service-objects"],
    ["getServiceObject", () => siteOperationsApi.getServiceObject("object-001"), "/api/service-objects/object-001"],
    [
      "getServiceObjectInsights",
      () => siteOperationsApi.getServiceObjectInsights("object-001"),
      "/api/service-objects/object-001/insights"
    ],
    [
      "getServiceObjectPlans",
      () => siteOperationsApi.getServiceObjectPlans("object-001"),
      "/api/service-objects/object-001/service-plans"
    ],
    ["getServicePlan", () => siteOperationsApi.getServicePlan("plan-001"), "/api/service-plans/plan-001"],
    [
      "getServiceScheduleOccurrences",
      () => siteOperationsApi.getServiceScheduleOccurrences(),
      "/api/service-schedule-occurrences"
    ],
    [
      "getServiceScheduleOccurrence",
      () => siteOperationsApi.getServiceScheduleOccurrence("schedule-001"),
      "/api/service-schedule-occurrences/schedule-001"
    ],
    ["getServiceRecords", () => siteOperationsApi.getServiceRecords(), "/api/service-records"],
    ["getServiceRecord", () => siteOperationsApi.getServiceRecord("record-001"), "/api/service-records/record-001"],
    [
      "getServiceRecordAudio",
      () => siteOperationsApi.getServiceRecordAudio("record-001"),
      "/api/service-records/record-001/audio"
    ]
  ])("fetches %s with the JSON read boundary", async (_name, callApi, path) => {
    mockJsonResponse({ id: "ok" });

    await expect(callApi()).resolves.toEqual({ id: "ok" });
    expect(globalThis.fetch).toHaveBeenCalledWith(path, {
      headers: { Accept: "application/json" }
    });
  });

  it.each([
    [
      "createSocialWorker",
      () => siteOperationsApi.createSocialWorker({ name: "王芳", phone: "13900000000", workerType: "service_personnel" }),
      "/api/social-workers",
      "POST",
      { name: "王芳", phone: "13900000000", workerType: "service_personnel" }
    ],
    [
      "updateSocialWorker",
      () => siteOperationsApi.updateSocialWorker("worker-001", { phone: "13800000000" }),
      "/api/social-workers/worker-001",
      "PATCH",
      { phone: "13800000000" }
    ],
    [
      "archiveSocialWorker",
      () => siteOperationsApi.archiveSocialWorker("worker-001"),
      "/api/social-workers/worker-001/archive",
      "POST",
      undefined
    ],
    [
      "updateSocialWorkerBadgeBinding",
      () => siteOperationsApi.updateSocialWorkerBadgeBinding("worker-001", { preferredBadgeId: "badge-021" }),
      "/api/social-workers/worker-001/badge-binding",
      "PUT",
      { preferredBadgeId: "badge-021" }
    ],
    [
      "activateSmartBadge",
      () => siteOperationsApi.activateSmartBadge({ deviceCode: "FW-021", siteId: "site-001" }),
      "/api/smart-badges/activations",
      "POST",
      { deviceCode: "FW-021", siteId: "site-001" }
    ],
    [
      "updateSmartBadge",
      () => siteOperationsApi.updateSmartBadge("badge-021", { status: "disabled" }),
      "/api/smart-badges/badge-021",
      "PATCH",
      { status: "disabled" }
    ],
    [
      "createServiceObject",
      () =>
        siteOperationsApi.createServiceObject({
          name: "李叔叔",
          idNumber: "330102194501011234",
          address: "红培社区 12 号",
          eligibilityType: "government",
          serviceProjects: ["助餐"]
        }),
      "/api/service-objects",
      "POST",
      { name: "李叔叔", idNumber: "330102194501011234", address: "红培社区 12 号", eligibilityType: "government", serviceProjects: ["助餐"] }
    ],
    [
      "updateServiceObject",
      () => siteOperationsApi.updateServiceObject("object-001", { careNotes: ["少盐"] }),
      "/api/service-objects/object-001",
      "PATCH",
      { careNotes: ["少盐"] }
    ],
    [
      "archiveServiceObject",
      () => siteOperationsApi.archiveServiceObject("object-001"),
      "/api/service-objects/object-001/archive",
      "POST",
      undefined
    ],
    [
      "updateServiceObjectFamilySubscriptions",
      () =>
        siteOperationsApi.updateServiceObjectFamilySubscriptions("object-001", {
          familyContacts: [],
          familySubscriptionSummary: "weekly"
        }),
      "/api/service-objects/object-001/family-subscriptions",
      "PUT",
      { familyContacts: [], familySubscriptionSummary: "weekly" }
    ],
    [
      "createServicePlan",
      () =>
        siteOperationsApi.createServicePlan("object-001", {
          serviceObjectId: "object-001",
          serviceProject: "助餐",
          cadenceRule: "RRULE:FREQ=WEEKLY",
          cadenceLabel: "每周一次",
          preferredTimeWindow: { start: "09:00", end: "10:00" },
          startDate: "2026-05-14",
          status: "active"
        }),
      "/api/service-objects/object-001/service-plans",
      "POST",
      {
        serviceObjectId: "object-001",
        serviceProject: "助餐",
        cadenceRule: "RRULE:FREQ=WEEKLY",
        cadenceLabel: "每周一次",
        preferredTimeWindow: { start: "09:00", end: "10:00" },
        startDate: "2026-05-14",
        status: "active"
      }
    ],
    [
      "updateServicePlan",
      () => siteOperationsApi.updateServicePlan("plan-001", { status: "paused" }),
      "/api/service-plans/plan-001",
      "PATCH",
      { status: "paused" }
    ],
    [
      "archiveServicePlan",
      () => siteOperationsApi.archiveServicePlan("plan-001"),
      "/api/service-plans/plan-001/archive",
      "POST",
      undefined
    ],
    [
      "createServicePlanException",
      () => siteOperationsApi.createServicePlanException("plan-001", { kind: "skip", effectiveFrom: "2026-05-14" }),
      "/api/service-plans/plan-001/exceptions",
      "POST",
      { kind: "skip", effectiveFrom: "2026-05-14" }
    ],
    [
      "updateServicePlanException",
      () => siteOperationsApi.updateServicePlanException("exception-001", { note: "家属请假" }),
      "/api/service-plan-exceptions/exception-001",
      "PATCH",
      { note: "家属请假" }
    ],
    [
      "createOneTimeServiceSchedule",
      () =>
        siteOperationsApi.createOneTimeServiceSchedule({
          serviceObjectId: "object-001",
          serviceProject: "助餐",
          serviceDate: "2026-05-14",
          timeWindow: { start: "09:00", end: "10:00" }
        }),
      "/api/service-schedule-occurrences",
      "POST",
      {
        serviceObjectId: "object-001",
        serviceProject: "助餐",
        serviceDate: "2026-05-14",
        timeWindow: { start: "09:00", end: "10:00" }
      }
    ],
    [
      "updateServiceScheduleOccurrence",
      () => siteOperationsApi.updateServiceScheduleOccurrence("schedule-001", { serviceRecordId: "record-001" }),
      "/api/service-schedule-occurrences/schedule-001",
      "PATCH",
      { serviceRecordId: "record-001" }
    ],
    [
      "exportServiceRecords",
      () =>
        siteOperationsApi.exportServiceRecords({
          recordIds: ["record-001"],
          fields: ["serviceObjectName"],
          includeExceptionFlags: true
        }),
      "/api/service-records/export",
      "POST",
      { recordIds: ["record-001"], fields: ["serviceObjectName"], includeExceptionFlags: true }
    ],
    [
      "updateServiceRecordReview confirm_assignment",
      () =>
        siteOperationsApi.updateServiceRecordReview("record-001", {
          action: "confirm_assignment",
          socialWorkerId: "worker-001"
        }),
      "/api/service-records/record-001/review",
      "PATCH",
      { action: "confirm_assignment", socialWorkerId: "worker-001" }
    ],
    [
      "updateServiceRecordReview complete_information",
      () =>
        siteOperationsApi.updateServiceRecordReview("record-001", {
          action: "complete_information",
          completedFields: { serviceProject: "助餐" }
        }),
      "/api/service-records/record-001/review",
      "PATCH",
      { action: "complete_information", completedFields: { serviceProject: "助餐" } }
    ],
    [
      "updateServiceRecordReview resolve_exception",
      () =>
        siteOperationsApi.updateServiceRecordReview("record-001", {
          action: "resolve_exception",
          resolvedExceptionIds: ["exception-001"]
        }),
      "/api/service-records/record-001/review",
      "PATCH",
      { action: "resolve_exception", resolvedExceptionIds: ["exception-001"] }
    ]
  ])("sends %s through the JSON mutation boundary", async (_name, callApi, path, method, body) => {
    mockJsonResponse({ ok: true });

    await expect(callApi()).resolves.toEqual({ ok: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(path, {
      method,
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  });

  it("throws a typed error for failed responses", async () => {
    globalThis.fetch = vi.fn(async () => new Response("not found", { status: 404 }));

    await expect(siteOperationsApi.getServiceScheduleOccurrences()).rejects.toBeInstanceOf(SiteOperationsApiError);
  });
});
