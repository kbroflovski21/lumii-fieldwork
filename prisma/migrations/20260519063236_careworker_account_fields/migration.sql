ALTER TABLE `users` ADD COLUMN `must_change_password` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `users` ADD COLUMN `initial_password` VARCHAR(32) NULL;
