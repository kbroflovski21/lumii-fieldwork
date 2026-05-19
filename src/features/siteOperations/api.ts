import type {
  ActivateSmartBadgeRequest,
  ActivationResult,
  CreateOneTimeServiceScheduleRequest,
  CreateServiceObjectRequest,
  CreateServicePlanExceptionRequest,
  CreateServicePlanRequest,
  CreateSocialWorkerRequest,
  ExportServiceRecordsRequest,
  MutationResult,
  OneTimeScheduleResult,
  ScheduleAdjustmentResult,
  ServiceAudioAsset,
  ServiceObject,
  ServiceObjectMutationResult,
  ServiceObjectsResponse,
  ServicePlan,
  ServiceRecord,
  ServiceRecordExportResult,
  ServiceRecordReviewResult,
  ServiceRecordsResponse,
  ServiceSchedulesResponse,
  SiteOperationsHomeResponse,
  SmartBadge,
  SmartBadgesResponse,
  SocialWorker,
  SocialWorkersResponse,
  UpdateFamilySubscriptionsRequest,
  UpdateServiceObjectRequest,
  UpdateServicePlanExceptionRequest,
  UpdateServicePlanRequest,
  UpdateServiceRecordReviewRequest,
  UpdateServiceScheduleOccurrenceRequest,
  UpdateSmartBadgeRequest,
  UpdateWorkerBadgeBindingRequest,
  UpdateSocialWorkerRequest
} from "./contracts";

export class SiteOperationsApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "SiteOperationsApiError";
    this.status = status;
  }
}

async function parseJson<T>(response: Response, path: string): Promise<T> {
  if (!response.ok) {
    throw new SiteOperationsApiError(response.status, `Request failed: ${path}`);
  }

  return response.json() as Promise<T>;
}

async function getJson<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = params ? `${path}?${new URLSearchParams(params)}` : path;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  return parseJson<T>(response, path);
}

async function sendJson<T>(path: string, method: "POST" | "PATCH" | "PUT", body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return parseJson<T>(response, path);
}

function siteParams(siteId?: string): Record<string, string> | undefined {
  return siteId ? { siteId } : undefined;
}

export const siteOperationsApi = {
  getHome: (siteId?: string) => getJson<SiteOperationsHomeResponse>("/api/site-operations/home", siteParams(siteId)),

  getSocialWorkers: (siteId?: string) => getJson<SocialWorkersResponse>("/api/social-workers", siteParams(siteId)),
  createSocialWorker: (request: CreateSocialWorkerRequest) =>
    sendJson<SocialWorker>("/api/social-workers", "POST", request),
  updateSocialWorker: (id: string, request: UpdateSocialWorkerRequest) =>
    sendJson<SocialWorker>(`/api/social-workers/${id}`, "PATCH", request),
  archiveSocialWorker: (id: string) => sendJson<MutationResult>(`/api/social-workers/${id}/archive`, "POST"),
  updateSocialWorkerBadgeBinding: (id: string, request: UpdateWorkerBadgeBindingRequest) =>
    sendJson<SocialWorker>(`/api/social-workers/${id}/badge-binding`, "PUT", request),

  getSmartBadges: (siteId?: string) => getJson<SmartBadgesResponse>("/api/smart-badges", siteParams(siteId)),
  getSmartBadge: (id: string) => getJson<SmartBadge>(`/api/smart-badges/${id}`),
  getSmartBadgeServiceRecords: (id: string) =>
    getJson<ServiceRecordsResponse>(`/api/smart-badges/${id}/service-records`),
  activateSmartBadge: (request: ActivateSmartBadgeRequest) =>
    sendJson<ActivationResult>("/api/smart-badges/activations", "POST", request),
  updateSmartBadge: (id: string, request: UpdateSmartBadgeRequest) =>
    sendJson<SmartBadge>(`/api/smart-badges/${id}`, "PATCH", request),

  getServiceObjects: (siteId?: string) => getJson<ServiceObjectsResponse>("/api/service-objects", siteParams(siteId)),
  getServiceObject: (id: string) => getJson<ServiceObject>(`/api/service-objects/${id}`),
  createServiceObject: (request: CreateServiceObjectRequest) =>
    sendJson<ServiceObjectMutationResult>("/api/service-objects", "POST", request),
  updateServiceObject: (id: string, request: UpdateServiceObjectRequest) =>
    sendJson<ServiceObjectMutationResult>(`/api/service-objects/${id}`, "PATCH", request),
  archiveServiceObject: (id: string) => sendJson<MutationResult>(`/api/service-objects/${id}/archive`, "POST"),
  getServiceObjectInsights: (id: string) => getJson<ServiceObject>(`/api/service-objects/${id}/insights`),
  updateServiceObjectFamilySubscriptions: (id: string, request: UpdateFamilySubscriptionsRequest) =>
    sendJson<ServiceObjectMutationResult>(`/api/service-objects/${id}/family-subscriptions`, "PUT", request),
  getServiceObjectPlans: (id: string) => getJson<ServicePlan[]>(`/api/service-objects/${id}/service-plans`),
  createServicePlan: (serviceObjectId: string, request: CreateServicePlanRequest) =>
    sendJson<ServicePlan>(`/api/service-objects/${serviceObjectId}/service-plans`, "POST", request),
  getServicePlan: (id: string) => getJson<ServicePlan>(`/api/service-plans/${id}`),
  updateServicePlan: (id: string, request: UpdateServicePlanRequest) =>
    sendJson<ServicePlan>(`/api/service-plans/${id}`, "PATCH", request),
  archiveServicePlan: (id: string) => sendJson<MutationResult>(`/api/service-plans/${id}/archive`, "POST"),
  createServicePlanException: (servicePlanId: string, request: CreateServicePlanExceptionRequest) =>
    sendJson<ServicePlan>(`/api/service-plans/${servicePlanId}/exceptions`, "POST", request),
  updateServicePlanException: (id: string, request: UpdateServicePlanExceptionRequest) =>
    sendJson<ServicePlan>(`/api/service-plan-exceptions/${id}`, "PATCH", request),

  getServiceScheduleOccurrences: (siteId?: string) =>
    getJson<ServiceSchedulesResponse>("/api/service-schedule-occurrences", siteParams(siteId)),
  getServiceSchedules: (siteId?: string) => getJson<ServiceSchedulesResponse>("/api/service-schedule-occurrences", siteParams(siteId)),
  createOneTimeServiceSchedule: (request: CreateOneTimeServiceScheduleRequest) =>
    sendJson<OneTimeScheduleResult>("/api/service-schedule-occurrences", "POST", request),
  getServiceScheduleOccurrence: (id: string) =>
    getJson<ServiceSchedulesResponse>(`/api/service-schedule-occurrences/${id}`),
  updateServiceScheduleOccurrence: (id: string, request: UpdateServiceScheduleOccurrenceRequest) =>
    sendJson<ScheduleAdjustmentResult>(`/api/service-schedule-occurrences/${id}`, "PATCH", request),

  getServiceRecords: (siteId?: string) => getJson<ServiceRecordsResponse>("/api/service-records", siteParams(siteId)),
  getServiceRecord: (id: string) => getJson<ServiceRecord>(`/api/service-records/${id}`),
  getServiceRecordAudio: (id: string) => getJson<ServiceAudioAsset>(`/api/service-records/${id}/audio`),
  exportServiceRecords: (request: ExportServiceRecordsRequest) =>
    sendJson<ServiceRecordExportResult>("/api/service-records/export", "POST", request),
  updateServiceRecordReview: (id: string, request: UpdateServiceRecordReviewRequest) =>
    sendJson<ServiceRecordReviewResult>(`/api/service-records/${id}/review`, "PATCH", request)
};
