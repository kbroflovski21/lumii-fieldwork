-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(64) NOT NULL,
    `username` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `role` ENUM('org_admin', 'site_operator', 'service_supervisor', 'careworker') NOT NULL,
    `org_id` VARCHAR(64) NOT NULL DEFAULT 'org-001',
    `site_ids` JSON NOT NULL,
    `phone` VARCHAR(64) NOT NULL DEFAULT '',
    `status` ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
    `created_by` VARCHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social_workers` (
    `id` VARCHAR(64) NOT NULL,
    `user_id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(64) NOT NULL DEFAULT '',
    `site_id` VARCHAR(64) NOT NULL DEFAULT 'site-001',
    `worker_type` VARCHAR(64) NOT NULL DEFAULT 'service_personnel',
    `qualification_labels` JSON NOT NULL,
    `status` ENUM('active', 'disabled', 'incomplete_profile') NOT NULL DEFAULT 'active',
    `preferred_badge_id` VARCHAR(64) NULL,
    `preferred_badge_device_code` VARCHAR(64) NULL,
    `preferred_badge_status` VARCHAR(64) NULL,
    `preferred_badge_last_sync_at` VARCHAR(64) NULL,
    `praise_count` INTEGER NOT NULL DEFAULT 0,
    `latest_praise_at` VARCHAR(64) NULL,
    `latest_praise_excerpt` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `smart_badges` (
    `id` VARCHAR(64) NOT NULL,
    `device_code` VARCHAR(64) NOT NULL,
    `org_id` VARCHAR(64) NOT NULL DEFAULT 'org-001',
    `site_id` VARCHAR(64) NOT NULL DEFAULT 'site-001',
    `site_name` VARCHAR(255) NULL,
    `status` ENUM('pending_activation', 'available', 'in_use', 'offline', 'low_battery', 'sync_delayed', 'lost', 'disabled') NOT NULL DEFAULT 'pending_activation',
    `battery_percent` INTEGER NULL,
    `activated_at` VARCHAR(64) NULL,
    `last_sync_at` VARCHAR(64) NULL,
    `last_recording_at` VARCHAR(64) NULL,
    `preferred_worker_id` VARCHAR(64) NULL,
    `preferred_worker_name` VARCHAR(255) NULL,
    `recent_service_record_ids` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `smart_badges_device_code_key`(`device_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_objects` (
    `id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(64) NULL,
    `age` INTEGER NULL,
    `gender` ENUM('female', 'male', 'unknown') NOT NULL DEFAULT 'unknown',
    `address` VARCHAR(500) NOT NULL DEFAULT '',
    `map_display_point` JSON NULL,
    `eligibility_type` ENUM('insurance', 'government', 'institution', 'self_paid') NOT NULL DEFAULT 'government',
    `service_projects` JSON NOT NULL,
    `service_frequency` VARCHAR(255) NULL,
    `care_notes` JSON NOT NULL,
    `risk_tags` JSON NOT NULL,
    `family_subscription_summary` VARCHAR(64) NOT NULL DEFAULT 'none',
    `latest_insight_summary` TEXT NULL,
    `insight_summaries` JSON NOT NULL,
    `state` VARCHAR(64) NULL DEFAULT 'normal',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `family_contacts` (
    `id` VARCHAR(64) NOT NULL,
    `service_object_id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `relation` VARCHAR(64) NOT NULL DEFAULT '',
    `phone` VARCHAR(64) NOT NULL DEFAULT '',
    `subscription_status` ENUM('none', 'daily', 'weekly', 'monthly', 'exception_only') NOT NULL DEFAULT 'none',
    `last_pushed_at` VARCHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_plans` (
    `id` VARCHAR(64) NOT NULL,
    `service_object_id` VARCHAR(64) NOT NULL,
    `service_project` VARCHAR(255) NOT NULL,
    `cadence_rule` VARCHAR(255) NOT NULL DEFAULT '',
    `cadence_label` VARCHAR(255) NOT NULL DEFAULT '',
    `preferred_time_window` JSON NOT NULL,
    `start_date` VARCHAR(64) NOT NULL,
    `end_date` VARCHAR(64) NULL,
    `primary_social_worker_id` VARCHAR(64) NULL,
    `primary_social_worker_name` VARCHAR(255) NULL,
    `status` ENUM('active', 'paused', 'archived') NOT NULL DEFAULT 'active',
    `next_schedule_at` VARCHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_plan_exceptions` (
    `id` VARCHAR(64) NOT NULL,
    `service_plan_id` VARCHAR(64) NOT NULL,
    `kind` ENUM('pause', 'time_change', 'worker_change', 'skip') NOT NULL,
    `effective_from` VARCHAR(64) NOT NULL,
    `effective_to` VARCHAR(64) NULL,
    `time_window` JSON NULL,
    `replacement_social_worker_id` VARCHAR(64) NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_schedules` (
    `id` VARCHAR(64) NOT NULL,
    `source` ENUM('service_plan', 'one_time') NOT NULL DEFAULT 'one_time',
    `service_plan_id` VARCHAR(64) NULL,
    `service_object_id` VARCHAR(64) NOT NULL,
    `service_object_name` VARCHAR(255) NOT NULL DEFAULT '',
    `service_project` VARCHAR(255) NOT NULL DEFAULT '',
    `address_snapshot` VARCHAR(500) NOT NULL DEFAULT '',
    `address` VARCHAR(500) NULL,
    `map_display_point` JSON NULL,
    `service_date` VARCHAR(64) NOT NULL,
    `start_time` VARCHAR(64) NULL,
    `end_time` VARCHAR(64) NULL,
    `time_window` JSON NOT NULL,
    `assigned_social_worker_id` VARCHAR(64) NULL,
    `assigned_social_worker_name` VARCHAR(255) NULL,
    `status` ENUM('scheduled', 'assigned', 'adjusted', 'in_progress', 'completed', 'cancelled', 'unassigned') NOT NULL DEFAULT 'scheduled',
    `notes` TEXT NULL,
    `service_record_id` VARCHAR(64) NULL,
    `plan_exception_applied` INTEGER NOT NULL DEFAULT 0,
    `risk_tags` JSON NOT NULL,
    `adjustment_history` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_records` (
    `id` VARCHAR(64) NOT NULL,
    `service_date` VARCHAR(64) NOT NULL,
    `start_time` VARCHAR(64) NOT NULL,
    `end_time` VARCHAR(64) NOT NULL,
    `duration_minutes` INTEGER NOT NULL DEFAULT 0,
    `social_worker_id` VARCHAR(64) NULL,
    `social_worker_name` VARCHAR(255) NULL,
    `service_object_id` VARCHAR(64) NULL,
    `service_object_name` VARCHAR(255) NULL,
    `family_contact_ids` JSON NOT NULL,
    `badge_id` VARCHAR(64) NOT NULL,
    `smart_badge_id` VARCHAR(64) NULL,
    `service_project` VARCHAR(255) NULL,
    `assignment_confidence` DOUBLE NOT NULL DEFAULT 0.5,
    `review_status` ENUM('needs_review', 'confirmed', 'info_incomplete', 'exception_open') NOT NULL DEFAULT 'needs_review',
    `export_status` ENUM('not_ready', 'exportable', 'exported', 'exported_with_flags') NOT NULL DEFAULT 'not_ready',
    `location_evidence` JSON NULL,
    `service_exceptions` JSON NOT NULL,
    `service_items` JSON NOT NULL,
    `exception_tags` JSON NOT NULL,
    `missing_fields` JSON NOT NULL,
    `audio_asset_id` VARCHAR(64) NULL,
    `transcript_id` VARCHAR(64) NULL,
    `structured_summary` TEXT NULL,
    `generated_summary` TEXT NULL,
    `export_history` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audio_assets` (
    `id` VARCHAR(64) NOT NULL,
    `record_id` VARCHAR(64) NOT NULL,
    `playback_url` VARCHAR(500) NULL,
    `duration_seconds` INTEGER NOT NULL DEFAULT 0,
    `captured_by_badge_id` VARCHAR(64) NULL,
    `uploaded_at` VARCHAR(64) NULL,
    `retention_label` VARCHAR(64) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transcripts` (
    `id` VARCHAR(64) NOT NULL,
    `record_id` VARCHAR(64) NOT NULL,
    `language` VARCHAR(16) NOT NULL DEFAULT 'zh-CN',
    `text` TEXT NOT NULL,
    `confidence` DOUBLE NULL,
    `segments` JSON NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `home_summary` (
    `id` VARCHAR(64) NOT NULL DEFAULT 'current',
    `summary_date` VARCHAR(64) NOT NULL,
    `total_scheduled_services` INTEGER NOT NULL DEFAULT 0,
    `unassigned_services` INTEGER NOT NULL DEFAULT 0,
    `active_social_workers` INTEGER NOT NULL DEFAULT 0,
    `online_badges` INTEGER NOT NULL DEFAULT 0,
    `records_need_review` INTEGER NOT NULL DEFAULT 0,
    `exportable_service_records` INTEGER NOT NULL DEFAULT 0,
    `highlights` JSON NOT NULL,
    `activities` JSON NOT NULL,
    `recommended_actions` JSON NOT NULL,
    `permission_state` VARCHAR(64) NOT NULL DEFAULT 'full',
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `agent_id` VARCHAR(64) NOT NULL,
    `session_key` VARCHAR(255) NOT NULL,
    `role` ENUM('user', 'assistant') NOT NULL,
    `content` TEXT NOT NULL,
    `msg_type` VARCHAR(64) NOT NULL DEFAULT 'text',
    `card_data` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_chat_agent_session`(`agent_id`, `session_key`, `id` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `family_contacts` ADD CONSTRAINT `family_contacts_service_object_id_fkey` FOREIGN KEY (`service_object_id`) REFERENCES `service_objects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_plans` ADD CONSTRAINT `service_plans_service_object_id_fkey` FOREIGN KEY (`service_object_id`) REFERENCES `service_objects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_plan_exceptions` ADD CONSTRAINT `service_plan_exceptions_service_plan_id_fkey` FOREIGN KEY (`service_plan_id`) REFERENCES `service_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_schedules` ADD CONSTRAINT `service_schedules_service_object_id_fkey` FOREIGN KEY (`service_object_id`) REFERENCES `service_objects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audio_assets` ADD CONSTRAINT `audio_assets_record_id_fkey` FOREIGN KEY (`record_id`) REFERENCES `service_records`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transcripts` ADD CONSTRAINT `transcripts_record_id_fkey` FOREIGN KEY (`record_id`) REFERENCES `service_records`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
