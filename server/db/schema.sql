-- Lumii Fieldwork Database Schema
-- Compatible with SQLite and MySQL
-- Convention: snake_case, TEXT for enums (SQLite has no enum type), JSON for arrays

CREATE TABLE IF NOT EXISTS social_workers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  site_id TEXT NOT NULL DEFAULT 'site-001',
  worker_type TEXT NOT NULL DEFAULT 'service_personnel',
  qualification_labels TEXT DEFAULT '[]', -- JSON array
  status TEXT NOT NULL DEFAULT 'active', -- active | disabled | incomplete_profile
  preferred_badge_id TEXT,
  preferred_badge_device_code TEXT,
  preferred_badge_status TEXT,
  preferred_badge_last_sync_at TEXT,
  praise_count INTEGER NOT NULL DEFAULT 0,
  latest_praise_at TEXT,
  latest_praise_excerpt TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS smart_badges (
  id TEXT PRIMARY KEY,
  device_code TEXT NOT NULL UNIQUE,
  org_id TEXT NOT NULL DEFAULT 'org-001',
  site_id TEXT NOT NULL DEFAULT 'site-001',
  site_name TEXT DEFAULT '红培社区站',
  status TEXT NOT NULL DEFAULT 'pending_activation', -- pending_activation|available|in_use|offline|low_battery|sync_delayed|lost|disabled
  battery_percent INTEGER,
  activated_at TEXT,
  last_sync_at TEXT,
  last_recording_at TEXT,
  preferred_worker_id TEXT,
  preferred_worker_name TEXT,
  recent_service_record_ids TEXT DEFAULT '[]', -- JSON array
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS service_objects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  age INTEGER,
  gender TEXT DEFAULT 'unknown', -- female | male | unknown
  address TEXT NOT NULL DEFAULT '',
  map_display_point TEXT, -- JSON {latitude, longitude, label}
  eligibility_type TEXT NOT NULL DEFAULT 'government', -- insurance|government|institution|self_paid
  service_projects TEXT DEFAULT '[]', -- JSON array
  service_frequency TEXT,
  care_notes TEXT DEFAULT '[]', -- JSON array
  risk_tags TEXT DEFAULT '[]', -- JSON array
  family_subscription_summary TEXT NOT NULL DEFAULT 'none', -- none|daily|weekly|monthly
  latest_insight_summary TEXT,
  insight_summaries TEXT DEFAULT '[]', -- JSON array
  state TEXT DEFAULT 'normal', -- ServiceObjectState
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS family_contacts (
  id TEXT PRIMARY KEY,
  service_object_id TEXT NOT NULL,
  name TEXT NOT NULL,
  relation TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  subscription_status TEXT NOT NULL DEFAULT 'none', -- none|daily|weekly|monthly|exception_only
  last_pushed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (service_object_id) REFERENCES service_objects(id)
);

CREATE TABLE IF NOT EXISTS service_plans (
  id TEXT PRIMARY KEY,
  service_object_id TEXT NOT NULL,
  service_project TEXT NOT NULL,
  cadence_rule TEXT NOT NULL DEFAULT '',
  cadence_label TEXT NOT NULL DEFAULT '',
  preferred_time_window TEXT DEFAULT '{}', -- JSON {start, end, label}
  start_date TEXT NOT NULL,
  end_date TEXT,
  primary_social_worker_id TEXT,
  primary_social_worker_name TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active|paused|archived
  next_schedule_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (service_object_id) REFERENCES service_objects(id)
);

CREATE TABLE IF NOT EXISTS service_plan_exceptions (
  id TEXT PRIMARY KEY,
  service_plan_id TEXT NOT NULL,
  kind TEXT NOT NULL, -- pause|time_change|worker_change|skip
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  time_window TEXT, -- JSON
  replacement_social_worker_id TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (service_plan_id) REFERENCES service_plans(id)
);

CREATE TABLE IF NOT EXISTS service_schedules (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'one_time', -- service_plan|one_time
  service_plan_id TEXT,
  service_object_id TEXT NOT NULL,
  service_object_name TEXT NOT NULL DEFAULT '',
  service_project TEXT NOT NULL DEFAULT '',
  address_snapshot TEXT NOT NULL DEFAULT '',
  address TEXT,
  map_display_point TEXT, -- JSON
  service_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  time_window TEXT DEFAULT '{}', -- JSON {start, end, label}
  assigned_social_worker_id TEXT,
  assigned_social_worker_name TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled|assigned|adjusted|in_progress|completed|cancelled
  notes TEXT,
  service_record_id TEXT,
  plan_exception_applied INTEGER DEFAULT 0,
  risk_tags TEXT DEFAULT '[]', -- JSON array
  adjustment_history TEXT DEFAULT '[]', -- JSON array of {action, detail, operatorName, adjustedAt}
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (service_object_id) REFERENCES service_objects(id)
);

CREATE TABLE IF NOT EXISTS service_records (
  id TEXT PRIMARY KEY,
  service_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  social_worker_id TEXT,
  social_worker_name TEXT,
  service_object_id TEXT,
  service_object_name TEXT,
  family_contact_ids TEXT DEFAULT '[]', -- JSON array
  badge_id TEXT NOT NULL,
  smart_badge_id TEXT,
  service_project TEXT,
  assignment_confidence REAL NOT NULL DEFAULT 0.5,
  review_status TEXT NOT NULL DEFAULT 'needs_review', -- confirmed|needs_review|info_incomplete|exception_open
  export_status TEXT NOT NULL DEFAULT 'not_ready', -- not_ready|exportable|exported|exported_with_flags
  location_evidence TEXT, -- JSON
  service_exceptions TEXT DEFAULT '[]', -- JSON array
  service_items TEXT DEFAULT '[]', -- JSON array of ServiceItem
  exception_tags TEXT DEFAULT '[]', -- JSON array
  missing_fields TEXT DEFAULT '[]', -- JSON array
  audio_asset_id TEXT,
  transcript_id TEXT,
  structured_summary TEXT,
  generated_summary TEXT,
  export_history TEXT DEFAULT '[]', -- JSON array
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audio_assets (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  playback_url TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  captured_by_badge_id TEXT,
  uploaded_at TEXT,
  retention_label TEXT,
  FOREIGN KEY (record_id) REFERENCES service_records(id)
);

CREATE TABLE IF NOT EXISTS transcripts (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'zh-CN',
  text TEXT NOT NULL DEFAULT '',
  confidence REAL,
  segments TEXT DEFAULT '[]', -- JSON array
  FOREIGN KEY (record_id) REFERENCES service_records(id)
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('org_admin', 'site_operator', 'service_supervisor', 'careworker')),
  org_id TEXT NOT NULL DEFAULT 'org-001',
  site_ids TEXT NOT NULL DEFAULT '[]',
  phone TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'disabled')),
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Home summary (cached/computed)
CREATE TABLE IF NOT EXISTS home_summary (
  id TEXT PRIMARY KEY DEFAULT 'current',
  summary_date TEXT NOT NULL,
  total_scheduled_services INTEGER NOT NULL DEFAULT 0,
  unassigned_services INTEGER NOT NULL DEFAULT 0,
  active_social_workers INTEGER NOT NULL DEFAULT 0,
  online_badges INTEGER NOT NULL DEFAULT 0,
  records_need_review INTEGER NOT NULL DEFAULT 0,
  exportable_service_records INTEGER NOT NULL DEFAULT 0,
  highlights TEXT DEFAULT '[]', -- JSON array
  activities TEXT DEFAULT '[]', -- JSON array
  recommended_actions TEXT DEFAULT '[]', -- JSON array
  permission_state TEXT NOT NULL DEFAULT 'full',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
