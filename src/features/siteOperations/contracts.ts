export type Severity = "info" | "warning" | "critical";

export type WorkAreaId =
  | "home"
  | "social_workers"
  | "smart_badges"
  | "service_objects"
  | "service_schedules"
  | "service_records"
  | "live_services"
  | "completed_services"
  | "follow_ups"
  | "family_feedback"
  | "training";

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
  status: "unassigned" | "scheduled" | "in_progress" | "cancelled" | "completed" | "missed";
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

  // 0606 additions
  matchStatus?: "exact" | "partial" | "unplanned" | "missed";
  plannedItems?: PlannedServiceItem[];
  actualSessionId?: string;
  recurringRuleId?: string;
  mapDisplayPoint?: MapDisplayPoint;
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

// ═══════════════════════════════════════════════════════════════════════
// V2 Data Model — 0604 Design Spec additions
// All types below are NEW. Existing types above are preserved as-is.
// ═══════════════════════════════════════════════════════════════════════

// ── 2.0 Qualification Tags (master data) ──

export interface QualificationTag {
  id: string;
  name: string; // "护士", "养老护理员(初级)", "急救证", etc.
  category: string; // "medical", "caregiving", "other"
}

// ── 2.1 Standard Catalog ──

export interface ServiceStandardCatalog {
  id: string;
  name: string; // "杭州市长护险标准" | "国家长护险标准"
  region: string; // "hangzhou" | "national"
  version: string; // "2024-v1"
  effectiveDate: string;
  status: "active" | "archived";
  categories: ServiceCategory[];
  totalItems: number; // 41 | 36
}

export interface ServiceCategory {
  id: string;
  catalogId: string;
  name: string; // "清洁卫生类" | "营养摄取类" | ...
  sortOrder: number;
}

export interface ServiceStandardItem {
  id: string;
  catalogId: string;
  categoryId: string;
  itemCode?: string; // 国家标准18位编码（如有）
  seq: number; // 项目编号 1-41
  name: string; // "整理床单位" | "面部清洁" | ...
  categoryName: string; // 大类名称（冗余方便显示）
  referenceMinutes: number; // 单次服务参考时间（分钟）
  frequency: string; // "1-2次/日" | "必要时" | "1次/周"
  description?: string; // 项目内涵
  serviceRequirements?: string; // 基本服务要求
  notes?: string; // 注意事项
  requiredQualifications: string[]; // 资质要求标签列表
}

// ── 2.2 Service Plan V2 (catalog-based) ──

export interface ServicePlanV2 {
  id: string;
  serviceObjectId: string; // 对应长者
  catalogId: string; // 使用哪套标准目录
  preferredWorkerId?: string; // 常用服务人员（仅供参考，非硬约束）
  status: "active" | "paused" | "archived";
  createdAt: string;
  updatedAt: string;
  approvedBy?: string; // 审批人
  items: ServicePlanItemV2[]; // 计划中的服务项目
}

export interface ServicePlanItemV2 {
  id: string;
  planId: string;
  standardItemId: string; // 关联标准目录项
  standardItemName: string; // 冗余：项目名称
  categoryName: string; // 冗余：大类名称
  referenceMinutes: number; // 参考工时
  frequency: string; // 计划频次（可能与标准不同）
  requiredQualifications: string[]; // 所需资质标签列表
  notes?: string; // 个性化备注
}

// ── 2.4 Device (generalized from SmartBadge) ──

export type DeviceType = "smart_badge" | "mmwave_radar" | "ble_beacon" | "smart_watch" | "phone_app";

export type DeviceCapability =
  | "audio_recording" // 录音
  | "audio_playback" // 喇叭/TTS播放
  | "mmwave_sensing" // 毫米波感知
  | "ble_proximity" // 蓝牙近场
  | "network_call" // 网络通话
  | "gps_location"; // GPS定位

export interface Device {
  id: string;
  deviceCode: string; // "GY-B001" | "GY-R001" | "GY-S001"
  deviceType: DeviceType;
  orgId: string;
  siteId: string;
  siteName: string;
  status:
    | "pending_activation"
    | "available"
    | "in_use"
    | "offline"
    | "low_battery"
    | "sync_delayed"
    | "lost"
    | "disabled";
  batteryPercent?: number;
  activatedAt?: string;
  lastSyncAt?: string;

  // 绑定关系
  boundToType?: "worker" | "elder_home";
  boundToId?: string; // 护工ID 或 长者ID
  boundToName?: string;

  // phone_app 专属字段
  appAccount?: { username: string; passwordSet: boolean; lastLoginAt?: string };

  // 设备能力标记
  capabilities: DeviceCapability[];
}

// ── 2.5 Service Session ──

export interface SelectedServiceItem {
  standardItemId: string;
  name: string;
  categoryName: string;
  referenceMinutes: number;
  frequency: string;
  checked: boolean; // 护工勾选
}

export interface TranscriptEntry {
  timestamp: string;
  speaker: "worker" | "elder" | "unknown";
  text: string;
}

export interface AIGuidanceEntry {
  timestamp: string;
  type: "reminder" | "warning" | "guidance";
  message: string;
  triggeredBy: "radar" | "audio" | "timer" | "system";
  ttsPlayed: boolean;
}

export interface ServiceSession {
  id: string;
  serviceDate: string;
  serviceObjectId: string;
  serviceObjectName: string;
  serviceObjectAddress: string;
  workerId: string;
  workerName: string;
  workerQualifications: string[]; // 执行服务时该 worker 持有的资质快照
  planId: string; // 关联服务计划

  // 排班关联 (0606 additions)
  scheduleId?: string;
  scheduleMatchStatus?: "exact" | "partial" | "unplanned";
  plannedItems?: PlannedServiceItem[];
  confirmedItems?: PlannedServiceItem[];
  itemsDiff?: "match" | "added" | "removed" | "changed";
  durationStatus?: "normal" | "too_short" | "too_long";
  elderVerification?: ElderVerification;

  // 任务项（从服务计划中勾选）
  selectedItems: SelectedServiceItem[];
  estimatedMinutes: number; // 预估工时

  // 生命周期状态
  status: "items_selected" | "verifying" | "in_progress" | "completed" | "cancelled";

  // 验证环节
  verification: {
    gpsMatch: boolean | null;
    gpsWorkerLat?: number;
    gpsWorkerLng?: number;
    gpsElderLat?: number;
    gpsElderLng?: number;
    bleBeaconMatch: boolean | null;
    bleBeaconId?: string;
    voiceprintMatch?: boolean | null;
    verifiedAt?: string;
  };

  // 时间戳
  startedAt?: string; // 开始服务
  completedAt?: string; // 结束服务
  submittedAt?: string; // 提交（含拍照）

  // 实时数据（服务进行中）
  realtimeData?: {
    audioStatus: "recording" | "paused" | "error";
    radarStatus: "connected" | "disconnected";
    radarDeviceId?: string;
    transcriptLog: TranscriptEntry[];
    aiGuidanceLog: AIGuidanceEntry[];
  };

  // 结束后数据
  completionPhoto?: string; // 拍照URL
  actualMinutes?: number; // 实际工时

  // 证据链
  evidenceChain: {
    gps: boolean;
    bleBeacon: boolean;
    voiceprint: boolean;
    audioRecording: boolean;
    radarData: boolean;
    photo: boolean;
  };

  // AI评估（服务完成后生成）
  aiAssessment?: {
    qualityScore: number; // 0-100
    summary: string;
    itemCompletionRate: number; // 项目完成率 0-1
    anomalies: string[];
    recommendations: string[];
  };
}

// ── 2.6 Follow-Up Record ──

export interface FollowUpRecord {
  id: string;
  serviceSessionId?: string; // 关联的服务会话（如有）
  serviceObjectId: string;
  serviceObjectName: string;
  type: "in_person" | "phone_manual" | "phone_ai";
  conductedBy: string; // 执行人ID
  conductedByName: string;
  conductedAt: string;
  location?: string; // 上门回访的地址
  conclusion: string; // 回访结论
  notes?: string;
  status: "scheduled" | "completed" | "cancelled";
}

// ── 2.7 Family Feedback ──

export interface FamilyFeedback {
  id: string;
  serviceObjectId: string;
  serviceObjectName: string;
  familyContactId: string;
  familyContactName: string;
  familyRelation: string;
  workerId?: string;
  workerName?: string;
  feedbackAt: string;
  channel: "phone" | "wechat" | "in_person" | "app" | "other";
  content: string;
  sentiment: "positive" | "neutral" | "negative";
  actionTaken?: string; // 针对反馈的措施
  actionTakenAt?: string;
  status: "pending" | "acknowledged" | "resolved";
}

// ── 2.8 Gov Audit — Anomaly Alert ──

export interface AnomalyAlert {
  id: string;
  institutionId: string;
  institutionName: string;
  sessionId: string;
  type:
    | "gps_mismatch"
    | "voiceprint_mismatch"
    | "duration_abnormal"
    | "missing_evidence"
    | "pattern_detected"
    | "quality_low";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  detectedAt: string;
  status: "pending" | "verified" | "resolved" | "dismissed";
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
}

// ── Gov Overview Data ──

export interface GovOverviewData {
  todayCompleted: number;
  weekCompleted: number;
  sixDimensionPassRate: number; // 0-100
  anomalyCount: number;
  recentAnomalies: AnomalyAlert[];
  qualityTrend: Array<{
    week: string;
    passRate: number;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════
// V3 Data Model — 0606 Design Spec additions
// All types below are NEW. Existing types above are preserved as-is.
// ═══════════════════════════════════════════════════════════════════════

// ── 3.0 Policy Constraints (attached to catalog) ──

export interface PolicyConstraint {
  id: string;
  catalogId: string;
  name: string;
  type: "duration_per_visit" | "visits_per_week" | "hours_per_month" | "max_elders_per_worker" | "custom";
  rule: {
    min?: number;
    max?: number;
    unit: "minutes" | "hours" | "count" | "days";
    period?: "per_visit" | "per_week" | "per_month";
  };
  description: string;
  severity: "hard" | "soft";
}

// ── 3.1 Recurring Schedule Rules ──

export interface PlannedServiceItem {
  standardItemId: string;
  name: string;
  referenceMinutes: number;
}

export interface RecurringScheduleRule {
  id: string;
  serviceObjectId: string;
  assignedWorkerId: string;
  planId: string;
  cadence: string; // "weekly:mon,wed,fri"
  cadenceLabel: string;
  startTime: string;
  endTime: string;
  plannedItems: PlannedServiceItem[];
  effectiveFrom: string;
  effectiveUntil?: string;
  status: "active" | "paused" | "archived";
}

// ── 3.2 Elder Verification (for service records) ──

export interface ElderVerification {
  status: "pass" | "fail" | "inconclusive" | "missing";
  mobilityDetected: boolean;
  mobilityLevel: "none" | "minimal" | "moderate" | "normal";
  declaredDisabilityLevel: string;
  consistentWithDeclaration: boolean;
  radarDataAvailable: boolean;
  heatmapUrl?: string;
  timelineDataUrl?: string;
  aiAnalysisSummary?: string;
}

// ── 3.3 Institution (for gov audit) ──

export interface InstitutionSite {
  id: string;
  name: string;
  address: string;
  workerCount: number;
  elderCount: number;
  evidencePassRate: number;
  elderVerifyPassRate: number;
}

export interface Institution {
  id: string;
  name: string;
  type: "direct" | "franchise";
  licenseNumber: string;
  address: string;
  siteCount: number;
  workerCount: number;
  elderCount: number;
  evidencePassRate: number;
  elderVerifyPassRate: number;
  anomalyRate: number;
  qualityScore: number;
  sites: InstitutionSite[];
}

// ── Training Records ──

export interface TrainingRecord {
  id: string;
  workerId: string;
  workerName: string;
  serviceItemId: string;
  serviceItemName: string;
  mode: "guidance" | "supervision" | "exam";
  completedAt: string;
  status: "completed" | "in_progress" | "failed";
  score?: number; // only for exam mode, 0-100
  siteId: string;
  siteName: string;
}

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
  plan_exception_active: "例外生效",
  // V2 status additions
  items_selected: "已选项目",
  verifying: "验证中",
  in_progress: "进行中",
  paused: "已暂停",
  pending: "待处理",
  acknowledged: "已确认",
  resolved: "已解决",
  dismissed: "已忽略",
  verified: "已核实",
  in_person: "上门回访",
  phone_manual: "人工电话",
  phone_ai: "AI电话",
  positive: "正面",
  neutral: "中性",
  negative: "负面",
  gps_mismatch: "GPS不匹配",
  voiceprint_mismatch: "声纹不匹配",
  duration_abnormal: "时长异常",
  missing_evidence: "证据缺失",
  pattern_detected: "模式异常",
  quality_low: "质量低",
  low: "低",
  medium: "中",
  high: "高",
  critical: "严重",
  smart_badge: "智能工牌",
  mmwave_radar: "毫米波雷达",
  ble_beacon: "蓝牙星标",
  smart_watch: "智能手表",
  phone_app: "手机App",
};
