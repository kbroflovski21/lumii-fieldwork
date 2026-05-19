-- Fill site_id for existing data: all seed data belongs to site-001
UPDATE `service_objects` SET `site_id` = 'site-001' WHERE `site_id` = '' OR `site_id` IS NULL;
UPDATE `service_schedules` SET `site_id` = 'site-001' WHERE `site_id` = '' OR `site_id` IS NULL;
UPDATE `service_records` SET `site_id` = 'site-001' WHERE `site_id` = '' OR `site_id` IS NULL;
UPDATE `home_summary` SET `site_id` = 'site-001' WHERE `site_id` = '' OR `site_id` IS NULL;

-- Link service_objects to site via social_worker's site_id where possible
UPDATE `service_objects` so
  JOIN `service_records` sr ON sr.service_object_id = so.id
  JOIN `social_workers` sw ON sw.id = sr.social_worker_id
SET so.site_id = sw.site_id
WHERE sw.site_id IS NOT NULL AND sw.site_id != '';

-- Link service_schedules to site via service_object's site_id
UPDATE `service_schedules` ss
  JOIN `service_objects` so ON so.id = ss.service_object_id
SET ss.site_id = so.site_id
WHERE so.site_id IS NOT NULL AND so.site_id != '';

-- Link service_records to site via social_worker's site_id
UPDATE `service_records` sr
  JOIN `social_workers` sw ON sw.id = sr.social_worker_id
SET sr.site_id = sw.site_id
WHERE sw.site_id IS NOT NULL AND sw.site_id != '';
