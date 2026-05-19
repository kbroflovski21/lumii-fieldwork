-- AddColumn
ALTER TABLE `service_objects` ADD COLUMN `site_id` VARCHAR(64) NOT NULL DEFAULT 'site-001';

-- AddColumn
ALTER TABLE `service_schedules` ADD COLUMN `site_id` VARCHAR(64) NOT NULL DEFAULT 'site-001';

-- AddColumn
ALTER TABLE `service_records` ADD COLUMN `site_id` VARCHAR(64) NOT NULL DEFAULT 'site-001';

-- AddColumn
ALTER TABLE `home_summary` ADD COLUMN `site_id` VARCHAR(64) NOT NULL DEFAULT 'site-001';
