CREATE TABLE `reservations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `pg_id` BIGINT UNSIGNED NOT NULL,
    `resident_id` BIGINT UNSIGNED NOT NULL,
    `bed_id` BIGINT UNSIGNED NOT NULL,
    `reservation_date` DATE NOT NULL,
    `reservation_start_date` DATE NOT NULL,
    `reservation_end_date` DATE NOT NULL,
    `expected_move_in_date` DATE NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    `active_resident_slot` INT UNSIGNED NULL,
    `notes` TEXT NULL,
    `created_by` BIGINT UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `cancelled_at` DATETIME(3) NULL,
    `cancelled_by` BIGINT UNSIGNED NULL,
    `cancellation_reason` VARCHAR(500) NULL,
    `expired_at` DATETIME(3) NULL,
    `expired_by` BIGINT UNSIGNED NULL,

    UNIQUE INDEX `reservations_public_id_key` (`public_id`),
    UNIQUE INDEX `reservations_active_resident_key` (`organization_id`, `resident_id`, `active_resident_slot`),
    INDEX `reservations_property_period_idx` (`organization_id`, `pg_id`, `status`, `reservation_start_date`, `reservation_end_date`),
    INDEX `reservations_resident_date_idx` (`organization_id`, `resident_id`, `reservation_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `reservations`
    ADD CONSTRAINT `reservations_organization_id_fkey`
        FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `reservations_organization_id_pg_id_fkey`
        FOREIGN KEY (`organization_id`, `pg_id`) REFERENCES `pgs` (`organization_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `reservations_organization_id_resident_id_fkey`
        FOREIGN KEY (`organization_id`, `resident_id`) REFERENCES `residents` (`organization_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `reservations_organization_id_pg_id_bed_id_fkey`
        FOREIGN KEY (`organization_id`, `pg_id`, `bed_id`) REFERENCES `beds` (`organization_id`, `pg_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `reservations_created_by_fkey`
        FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `reservations_cancelled_by_fkey`
        FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `reservations_expired_by_fkey`
        FOREIGN KEY (`expired_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
