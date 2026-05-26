export type Severity = "info" | "warning" | "critical";

export type WorkAreaId =
  | "home"
  | "social_workers"
  | "smart_badges"
  | "service_objects"
  | "service_schedules"
  | "service_records";

export const workAreas: Array<{ id: WorkAreaId; label: string }> = [
  { id: "home", label: "首页" },
  { id: "social_workers", label: "服务人员" },
  { id: "smart_badges", label: "设备" },
  { id: "service_objects", label: "长者" },
  { id: "service_schedules", label: "服务排期" },
  { id: "service_records", label: "服务记录" },
];

export type PermissionState = "full" | "read_only" | "restricted";

export type WorkAreaOperationalState = {
  permission: PermissionState;
  isLoading: boolean;
  errorMessage?: string;
  unavailableMessage?: string;
};

export type BadgeBindingSummary = {
  badgeId: string;
  deviceCode: string;
  status: SmartBadgeStatus;
  lastSyncAt?: string;
};

export type WorkerPraiseSummary = {
  praiseCount: number;
  latestPraiseAt?: string;
  latestPraiseExcerpt?: string;
};

export type MapDisplayPoint = {
  latitude: number;
  longitude: number;
  label?: string;
};

export type HomeSummary = {
  date: string;
  totalScheduledServices: number;
  unassignedServices: number;
  activeSocialWorkers: number;
  onlineBadges: number;
  recordsNeedReview: number;
  exportableServiceRecords: number;
};

export type HomeHighlight = {
  id: string;
  type: "schedule_gap" | "record_review" | "badge_issue" | "service_object_risk" | "export_ready";
  title: string;
  description: string;
  severity: Severity;
  relatedEntityType: "social_worker" | "badge" | "service_schedule" | "service_record" | "service_object";
  relatedEntityId: string;
};

export type HomeActivity = {
  id: string;
  occurredAt: string;
  title: string;
  description?: string;
  relatedEntityType?: HomeHighlight["relatedEntityType"];
  relatedEntityId?: string;
};

export type HomeRecommendedAction = {
  id: string;
  label: string;
  targetWorkspace: Exclude<WorkAreaId, "home">;
  relatedEntityId?: string;
};

export type SiteOperationsPermissionState = PermissionState;

export type SiteOperationsHomeResponse = {
  summary: HomeSummary;
  highlights: HomeHighlight[];
  activities: HomeActivity[];
  recommendedActions: HomeRecommendedAction[];
  permissionState: SiteOperationsPermissionState;
};

export type SocialWorkerStatus = "active" | "disabled" | "incomplete_profile";

export type WorkerAccount = {
  username: string;
  mustChangePassword: boolean;
  initialPassword: string | null;
};

export type SocialWorker = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  siteId: string;
  workerType: "service_personnel";
  qualificationLabels: string[];
  status: SocialWorkerStatus;
  preferredBadge?: BadgeBindingSummary;
  praiseSummary: WorkerPraiseSummary;
  account?: WorkerAccount;
};

export type CreateSocialWorkerRequest = {
  name: string;
  phone: string;
  workerType: "service_personnel";
  qualificationLabels?: string[];
  preferredBadgeId?: string;
};

export type UpdateSocialWorkerRequest = {
  name?: string;
  phone?: string;
  qualificationLabels?: string[];
  status?: SocialWorkerStatus;
};

export type UpdateWorkerBadgeBindingRequest = {
  preferredBadgeId?: string;
};

export type SocialWorkersResponse = {
  socialWorkers: SocialWorker[];
  operationalState: WorkAreaOperationalState;
};

export type SmartBadgeStatus =
  | "pending_activation"
  | "available"
  | "in_use"
  | "offline"
  | "low_battery"
  | "sync_delayed"
  | "lost"
  | "disabled";

export type SmartBadge = {
  id: string;
  deviceCode: string;
  orgId: string;
  siteId: string;
  siteName?: string;
  status: SmartBadgeStatus;
  batteryPercent?: number;
  activatedAt?: string;
  lastSyncAt?: string;
  lastRecordingAt?: string;
  preferredWorkerId?: string;
  preferredWorkerName?: string;
  recentServiceRecordIds: string[];
};

export type ActivateSmartBadgeRequest = {
  deviceCode: string;
  siteId: string;
  preferredWorkerId?: string;
};

export type UpdateSmartBadgeRequest = {
  status?: SmartBadgeStatus;
  preferredWorkerId?: string;
};

export type SmartBadgesResponse = {
  smartBadges: SmartBadge[];
  operationalState: WorkAreaOperationalState;
};

export type ServiceEligibilityType = "insurance" | "government" | "institution" | "self_paid";

export type FamilyContact = {
  id: string;
  name: string;
  relation: string;
  phone: string;
  wechatId?: string;
  subscriptionStatus: "none" | "daily" | "weekly" | "monthly" | "exception_only";
  lastPushedAt?: string;
};

export type ServicePlanSummary = {
  id: string;
  serviceObjectId: string;
  serviceProject: string;
  cadenceLabel: string;
  preferredTimeWindow: { start: string; end: string; label?: string };
  primarySocialWorkerId?: string;
  primarySocialWorkerName?: string;
  status: "active" | "paused" | "archived";
  activeExceptionCount: number;
};

export type ServicePlanException = {
  id: string;
  servicePlanId: string;
  kind: "pause" | "time_change" | "worker_change" | "skip";
  effectiveFrom: string;
  effectiveTo?: string;
  timeWindow?: { start: string; end: string; label?: string };
  replacementSocialWorkerId?: string;
  note?: string;
};

export type SopLink = {
  sopId: string;
  sopName: string;
};

export type ServicePlan = {
  id: string;
  serviceObjectId: string;
  serviceProject: string;
  cadenceRule: string;
  cadenceLabel: string;
  preferredTimeWindow: { start: string; end: string; label?: string };
  startDate: string;
  endDate?: string;
  description?: string;
  primarySocialWorkerId?: string;
  status: "active" | "paused" | "archived";
  exceptions: ServicePlanException[];
  sopLinks?: SopLink[];
  nextScheduleAt?: string;
};

export type AiScheduleResult = {
  plan: {
    cadenceRule: string;
    cadenceLabel: string;
    timeWindow: { start: string; end: string };
    startDate: string;
    isRecurring: boolean;
    serviceContent: string;
  };
  matchedSops: Array<{ id: string; name: string }>;
  preview: Array<{ date: string; dayLabel: string; timeLabel: string }>;
};

export type ServiceObjectState =
  | "normal"
  | "family_binding_pending"
  | "subscribed"
  | "risk_tagged"
  | "service_ineligible"
  | "plan_active"
  | "plan_paused"
  | "plan_exception_active";

export type ServiceObject = {
  id: string;
  name: string;
  phone?: string;
  idNumber?: string;
  age?: number;
  gender?: "female" | "male" | "unknown";
  address: string;

  eligibilityType: ServiceEligibilityType | string;
  serviceProjects: string[];
  careNotes: string[];
  riskTags: string[];
  familySubscriptionSummary: "none" | "daily" | "weekly" | "monthly";
  latestInsightSummary?: string;
  insightSummaries?: Array<{ id: string; title: string; description: string; severity?: Severity }>;
  servicePlanSummaries: ServicePlanSummary[];
  familyContacts: FamilyContact[];
  state?: ServiceObjectState;
};

export type CreateServiceObjectRequest = {
  name: string;
  phone?: string;
  idNumber: string;
  age?: number;
  address: string;

  eligibilityType: ServiceEligibilityType;
  serviceProjects: string[];
  careNotes?: string[];
  riskTags?: string[];
};

export type UpdateServiceObjectRequest = Partial<CreateServiceObjectRequest>;

export type UpdateFamilySubscriptionsRequest = {
  familyContacts: FamilyContact[];
  familySubscriptionSummary: ServiceObject["familySubscriptionSummary"];
};

export type ServiceObjectsResponse = {
  serviceObjects: ServiceObject[];
  servicePlans: ServicePlan[];
  operationalState: WorkAreaOperationalState;
};

export type CreateServicePlanRequest = Omit<ServicePlan, "id" | "exceptions" | "nextScheduleAt">;
export type UpdateServicePlanRequest = Partial<CreateServicePlanRequest>;
export type CreateServicePlanExceptionRequest = Omit<ServicePlanException, "id" | "servicePlanId">;
export type UpdateServicePlanExceptionRequest = Partial<CreateServicePlanExceptionRequest>;

export type ServiceScheduleOccurrence = {
  id: string;
  source: "service_plan" | "one_time";
  servicePlanId?: string;
  serviceObjectId: string;
  serviceObjectName: string;
  serviceProject: string;
  addressSnapshot: string;

  serviceDate: string;
  timeWindow: { start: string; end: string; label?: string };
  assignedSocialWorkerId?: string;
  assignedSocialWorkerName?: string;
  status: "unassigned" | "scheduled" | "in_progress" | "cancelled" | "completed";
  notes?: string;
  serviceRecordId?: string;
  planExceptionApplied?: boolean;
  startTime?: string;
  endTime?: string;
  address?: string;
  mapQueryText?: string;
  latitude?: number;
  longitude?: number;
  riskTags: string[];
};

export type ServiceSchedule = ServiceScheduleOccurrence;

export type CreateOneTimeServiceScheduleRequest = {
  serviceObjectId?: string;
  minimalProfile?: Pick<CreateServiceObjectRequest, "name" | "age" | "address">;
  serviceProject: string;
  serviceDate: string;
  timeWindow: { start: string; end: string; label?: string };
  assignedSocialWorkerId?: string;
};

export type UpdateServiceScheduleOccurrenceRequest = {
  serviceDate?: string;
  timeWindow?: { start: string; end: string; label?: string };
  assignedSocialWorkerId?: string;
  status?: ServiceScheduleOccurrence["status"];
  notes?: string;
  serviceRecordId?: string;
};

export type ServiceSchedulesResponse = {
  serviceSchedules: ServiceSchedule[];
  operationalState: WorkAreaOperationalState;
};

export type GpsPoint = {
  latitude: number;
  longitude: number;
  capturedAt?: string;
  accuracyMeters?: number;
};

export type ServiceLocationEvidence = {
  startPoint?: GpsPoint;
  endPoint?: GpsPoint;
  routePoints?: GpsPoint[];
  addressMatched?: boolean;
};

export type ServiceException = {
  id: string;
  type: "late_arrival" | "early_leave" | "service_incomplete" | "safety_risk" | "other";
  title: string;
  description: string;
  status: "open" | "resolved";
  resolvedAt?: string;
};

export type ServiceRecordExportHistory = {
  id: string;
  exportedAt: string;
  operatorName: string;
  fileVersion: string;
  filterSummary: string;
  exceptionFlags?: string[];
  unresolvedItems?: string[];
};

export type ServiceAudioAsset = {
  id: string;
  recordId: string;
  playbackUrl?: string;
  durationSeconds: number;
  capturedByBadgeId: string;
  uploadedAt: string;
  retentionLabel?: string;
};

export type ServiceTranscript = {
  id: string;
  recordId: string;
  language: "zh-CN";
  text: string;
  confidence?: number;
  segments: Array<{
    startSecond: number;
    endSecond: number;
    speaker: "social_worker" | "service_object" | "family" | "unknown";
    text: string;
  }>;
};

export type ServiceItemStatus = "completed" | "skipped" | "abnormal" | "pending";

export type ServiceItem = {
  id: string;
  seq: number;
  title: string;
  category: "business" | "process";
  status: ServiceItemStatus;
  requirementText?: string;
  source?: "general" | "service";
  transcriptExcerpts?: Array<{
    text: string;
    startTime?: string;
    endTime?: string;
  }>;
  startTime?: string;
  endTime?: string;
  audioClipUrl?: string;
  audioDurationSeconds?: number;
  transcript?: string;
  abnormalReason?: string;
};

export type SopGroup = {
  sopName: string;
  sopType: "general" | "service";
  items: ServiceItem[];
};

export type ServiceRecord = {
  id: string;
  serviceDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  socialWorkerId?: string;
  socialWorkerName?: string;
  serviceObjectId?: string;
  serviceObjectName?: string;
  elderName?: string;
  serviceAddress?: string;
  familyContactIds: string[];
  badgeId: string;
  smartBadgeId?: string;
  serviceProject?: string;
  serviceProjects?: string[];
  assignmentConfidence: number;
  reviewStatus: "confirmed" | "needs_review" | "info_incomplete" | "exception_open";
  exportStatus: "not_ready" | "exportable" | "exported" | "exported_with_flags";
  locationEvidence?: ServiceLocationEvidence;
  serviceExceptions: ServiceException[];
  serviceItems?: ServiceItem[];
  sopGroups?: SopGroup[];
  expectedSops?: Array<{ sopId: string; sopName: string }>;
  exceptionTags: string[];
  missingFields: string[];
  audioAssetId: string;
  transcriptId: string;
  structuredSummary: string;
  generatedSummary?: string;
  exportHistory: ServiceRecordExportHistory[];
};

export type UpdateServiceRecordReviewRequest = {
  action: "confirm_assignment" | "complete_information" | "resolve_exception";
  socialWorkerId?: string;
  serviceObjectId?: string;
  completedFields?: Record<string, string>;
  resolvedExceptionIds?: string[];
  note?: string;
};

export type ExportServiceRecordsRequest = {
  recordIds: string[];
  filters?: Record<string, string | boolean>;
  fields: string[];
  includeExceptionFlags: boolean;
};

export type ServiceRecordsResponse = {
  serviceRecords: ServiceRecord[];
  audioAssets: ServiceAudioAsset[];
  transcripts: ServiceTranscript[];
  serviceObjects: ServiceObject[];
  smartBadges: SmartBadge[];
  operationalState: WorkAreaOperationalState;
};

export type MutationResult = {
  ok: true;
  id: string;
  message?: string;
};

export type ActivationResult = MutationResult & { smartBadge: SmartBadge };
export type OneTimeScheduleResult = MutationResult & { serviceSchedule: ServiceScheduleOccurrence };
export type ScheduleAdjustmentResult = MutationResult & { serviceSchedule: ServiceScheduleOccurrence };
export type ServiceObjectMutationResult = MutationResult & { serviceObject: ServiceObject };
export type ServiceRecordReviewResult = MutationResult & { serviceRecord: ServiceRecord };
export type ServiceRecordExportResult = MutationResult & {
  exportId: string;
  fileVersion: string;
  exportedAt: string;
};

export const statusText: Record<string, string> = {
  pending_activation: "待激活",
  available: "可用",
  in_use: "使用中",
  offline: "离线",
  low_battery: "低电量",
  sync_delayed: "同步延迟",
  lost: "遗失",
  disabled: "已停用",
  active: "在职",
  incomplete_profile: "待补全",
  archived: "已归档",
  on_leave: "请假",
  inactive: "停用",
  training_required: "待培训",
  temporarily_unavailable: "暂不可用",
  online: "在线",
  not_synced: "未同步",
  unassigned: "待分配",
  scheduled: "待执行",
  assigned: "待执行",
  adjusted: "待执行",
  cancelled: "已取消",
  suspended: "已停用",
  completed: "已完成",
  one_time: "单次服务",
  plan_generated: "周期生成",
  confirmed: "已确认",
  needs_review: "待复核",
  info_incomplete: "信息不完整",
  exception_open: "异常未闭环",
  not_ready: "暂不可导出",
  exportable: "可导出",
  exported: "已导出",
  exported_with_flags: "带标记导出",
  full: "可操作",
  read_only: "只读",
  restricted: "权限受限",
  none: "未订阅",
  daily: "日报",
  weekly: "周报",
  monthly: "月报",
  exception_only: "异常订阅",
  family_binding_pending: "家属待绑定",
  subscribed: "已订阅",
  risk_tagged: "风险关注",
  service_ineligible: "资格待复核",
  plan_active: "计划生效",
  plan_paused: "计划暂停",
  plan_exception_active: "例外生效"
};
