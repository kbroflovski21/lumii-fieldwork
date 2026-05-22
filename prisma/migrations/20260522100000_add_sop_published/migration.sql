-- Add published column
ALTER TABLE `sops` ADD COLUMN `published` TINYINT(1) NOT NULL DEFAULT 0;

-- Auto-publish SOPs that already have all 3 content fields filled
UPDATE `sops`
SET `published` = 1
WHERE `sop_content` IS NOT NULL AND `sop_content` != ''
  AND `supervision_content` IS NOT NULL AND `supervision_content` != ''
  AND `report_content` IS NOT NULL AND `report_content` != ''
  AND `status` = 'active';
