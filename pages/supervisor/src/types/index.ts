export type RoleId = 'group_admin' | 'site_ops' | 'supervisor' | 'social_worker' | 'family';

export interface RoleConfig {
  id: RoleId;
  name: string;
  subtitle: string;
  icon: string;
  color: string;
  tabs: TabConfig[];
  defaultMessages: Message[];
  suggestedQuestions: string[];
}

export interface TabConfig {
  key: string;
  label: string;
}

export interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  tabUpdate?: { tabKey: string; highlight?: boolean };
}

export interface SocialWorker {
  id: string;
  name: string;
  phone: string;
  skills: string[];
  status: 'available' | 'on_service' | 'off_duty';
  todayTasks: number;
  completedTasks: number;
}

export interface ServiceRecipient {
  id: string;
  name: string;
  age: number;
  address: string;
  healthNotes: string;
  riskLevel: 'low' | 'medium' | 'high';
  familyContact: string;
  familyPhone: string;
  serviceFrequency: string;
  lastService: string;
  concerns: string[];
}

export interface ServiceTask {
  id: string;
  recipientId: string;
  recipientName: string;
  address: string;
  workerName: string;
  workerId: string;
  serviceType: string;
  scheduledTime: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes: string;
}

export interface ServiceRecord {
  id: string;
  taskId: string;
  workerName: string;
  recipientName: string;
  serviceType: string;
  startTime: string;
  endTime: string;
  duration: string;
  status: 'normal' | 'warning' | 'anomaly';
  summary: string;
  sopCompletion: number;
  confidence: number;
  pendingItems: string[];
}

export interface SmartBadge {
  id: string;
  deviceCode: string;
  assignedWorker: string | null;
  status: 'active' | 'idle' | 'recording' | 'offline' | 'lost';
  battery: number;
  lastSeen: string;
  orgName: string;
}

export interface SOPItem {
  id: string;
  serviceType: string;
  version: string;
  steps: SOPStep[];
  requiredItems: string[];
  completionCriteria: string;
  status: 'active' | 'draft' | 'archived';
  lastUpdated: string;
}

export interface SOPStep {
  order: number;
  title: string;
  description: string;
  required: boolean;
  exceptionBranch?: string;
}

export interface PendingItem {
  id: string;
  type: 'low_confidence' | 'anomaly' | 'missing_field' | 'sop_gap' | 'family_feedback';
  title: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
  relatedRecord: string;
  createdAt: string;
}

export interface FamilyReport {
  id: string;
  recipientName: string;
  period: string;
  type: 'daily' | 'weekly' | 'monthly';
  summary: string;
  statusChange: string;
  concerns: string[];
  generatedAt: string;
}

export interface ReportStrategyItem {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  isCustom: boolean;
}

export interface ReportStrategy {
  id: string;
  sopId: string;
  serviceType: string;
  items: ReportStrategyItem[];
  lastUpdated: string;
}

export interface SupervisionStrategy {
  id: string;
  sopId: string;
  serviceType: string;
  onStart: string;
  duringService: string;
  checkMode: 'any_order' | 'sequential';
  onEnd: string;
  customRules: string[];
  lastUpdated: string;
}

export interface KPI {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'flat';
  trendValue?: string;
}
