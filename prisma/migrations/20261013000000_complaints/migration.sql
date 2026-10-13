CREATE TABLE `complaints` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `pg_id` BIGINT UNSIGNED NOT NULL,
    `resident_stay_id` BIGINT UNSIGNED NOT NULL,
    `category` VARCHAR(40) NOT NULL,
    `title` VARCHAR(180) NOT NULL,
    `description` TEXT NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    `assigned_to` BIGINT UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `resolved_at` DATETIME(3) NULL,
    UNIQUE INDEX `complaints_public_id_key` (`public_id`),
    INDEX `complaints_organization_id_pg_id_status_created_at_idx` (`organization_id`, `pg_id`, `status`, `created_at`),
    INDEX `complaints_resident_stay_id_created_at_idx` (`resident_stay_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `complaint_events` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `complaint_id` BIGINT UNSIGNED NOT NULL,
    `actor_id` BIGINT UNSIGNED NOT NULL,
    `event_type` VARCHAR(30) NOT NULL,
    `from_status` VARCHAR(30) NULL,
    `to_status` VARCHAR(30) NULL,
    `note` VARCHAR(1000) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `complaint_events_public_id_key` (`public_id`),
    INDEX `complaint_events_complaint_id_created_at_idx` (`complaint_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `complaints`
    ADD CONSTRAINT `complaints_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `complaints_organization_id_pg_id_fkey` FOREIGN KEY (`organization_id`, `pg_id`) REFERENCES `pgs` (`organization_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `complaints_resident_stay_id_fkey` FOREIGN KEY (`resident_stay_id`) REFERENCES `resident_stays` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `complaints_assigned_to_fkey` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `complaint_events`
    ADD CONSTRAINT `complaint_events_complaint_id_fkey` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `complaint_events_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
