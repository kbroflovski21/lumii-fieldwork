-- CreateTable
CREATE TABLE `sites` (
    `id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `address` VARCHAR(500) NOT NULL DEFAULT '',
    `contact_name` VARCHAR(255) NOT NULL DEFAULT '',
    `contact_phone` VARCHAR(64) NOT NULL DEFAULT '',
    `org_id` VARCHAR(64) NOT NULL DEFAULT 'org-001',
    `status` VARCHAR(32) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `site_users` (
    `id` VARCHAR(64) NOT NULL,
    `site_id` VARCHAR(64) NOT NULL,
    `user_id` VARCHAR(64) NOT NULL,

    UNIQUE INDEX `site_users_site_id_user_id_key`(`site_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `site_users` ADD CONSTRAINT `site_users_site_id_fkey` FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `site_users` ADD CONSTRAINT `site_users_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
