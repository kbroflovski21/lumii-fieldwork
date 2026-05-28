-- Add database indexes for query performance

-- users: filter by org
CREATE INDEX `idx_users_org` ON `users`(`org_id`);

-- social_workers: filter by site, lookup by user
CREATE INDEX `idx_social_workers_site` ON `social_workers`(`site_id`);
CREATE INDEX `idx_social_workers_user` ON `social_workers`(`user_id`);

-- smart_badges: filter by site
CREATE INDEX `idx_smart_badges_site` ON `smart_badges`(`site_id`);

-- service_objects: filter by site
CREATE INDEX `idx_service_objects_site` ON `service_objects`(`site_id`);

-- family_contacts: lookup by service object
CREATE INDEX `idx_family_contacts_object` ON `family_contacts`(`service_object_id`);

-- service_plans: lookup by service object
CREATE INDEX `idx_service_plans_object` ON `service_plans`(`service_object_id`);

-- service_plan_exceptions: lookup by plan
CREATE INDEX `idx_plan_exceptions_plan` ON `service_plan_exceptions`(`service_plan_id`);

-- service_schedules: list by site+date, lookup by object and plan
CREATE INDEX `idx_schedules_site_date` ON `service_schedules`(`site_id`, `service_date`);
CREATE INDEX `idx_schedules_object` ON `service_schedules`(`service_object_id`);
CREATE INDEX `idx_schedules_plan` ON `service_schedules`(`service_plan_id`);

-- service_records: list by site+date, lookup by badge
CREATE INDEX `idx_records_site_date` ON `service_records`(`site_id`, `service_date` DESC);
CREATE INDEX `idx_records_badge` ON `service_records`(`badge_id`);

-- audio_assets: lookup by record
CREATE INDEX `idx_audio_assets_record` ON `audio_assets`(`record_id`);

-- transcripts: lookup by record
CREATE INDEX `idx_transcripts_record` ON `transcripts`(`record_id`);

-- sop_steps: lookup by sop
CREATE INDEX `idx_sop_steps_sop` ON `sop_steps`(`sop_id`);

-- recordings: list by site+time, lookup by badge and worker
CREATE INDEX `idx_recordings_site_started` ON `recordings`(`site_id`, `started_at` DESC);
CREATE INDEX `idx_recordings_badge` ON `recordings`(`badge_id`);
CREATE INDEX `idx_recordings_worker` ON `recordings`(`worker_id`);
