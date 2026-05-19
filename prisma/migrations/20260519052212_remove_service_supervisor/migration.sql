-- AlterTable: Remove service_supervisor from UserRole enum
ALTER TABLE `users` MODIFY COLUMN `role` ENUM('org_admin', 'site_operator', 'careworker') NOT NULL;
