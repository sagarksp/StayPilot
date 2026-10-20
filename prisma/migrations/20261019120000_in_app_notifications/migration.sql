CREATE TABLE `notifications` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `pg_id` BIGINT UNSIGNED NULL,
    `dedupe_key` VARCHAR(180) NOT NULL,
    `notification_type` VARCHAR(40) NOT NULL,
    `title` VARCHAR(180) NOT NULL,
    `message` VARCHAR(500) NOT NULL,
    `action_url` VARCHAR(500) NOT NULL,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `notifications_public_id_key` (`public_id`),
    UNIQUE INDEX `notifications_org_user_dedupe_key` (`organization_id`, `user_id`, `dedupe_key`),
    INDEX `notifications_inbox_idx` (`organization_id`, `user_id`, `read_at`, `created_at`),
    INDEX `notifications_property_idx` (`organization_id`, `pg_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `notifications`
    ADD CONSTRAINT `notifications_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `notifications_property_fkey` FOREIGN KEY (`organization_id`, `pg_id`) REFERENCES `pgs` (`organization_id`, `id`) ON DELETE CASCADE ON UPDATE CASCADE;
