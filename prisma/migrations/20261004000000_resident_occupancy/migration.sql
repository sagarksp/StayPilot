-- Add the composite bed key needed to enforce same-organization stays.
CREATE UNIQUE INDEX `beds_organization_id_pg_id_id_key`
    ON `beds` (`organization_id`, `pg_id`, `id`);

CREATE TABLE `residents` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(180) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `email` VARCHAR(254) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `residents_public_id_key` (`public_id`),
    UNIQUE INDEX `residents_organization_id_id_key` (`organization_id`, `id`),
    INDEX `residents_organization_id_name_idx` (`organization_id`, `name`),
    INDEX `residents_organization_id_phone_idx` (`organization_id`, `phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `resident_stays` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `pg_id` BIGINT UNSIGNED NOT NULL,
    `resident_id` BIGINT UNSIGNED NOT NULL,
    `bed_id` BIGINT UNSIGNED NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `active_bed_slot` INT UNSIGNED NULL,
    `active_resident_slot` INT UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `resident_stays_public_id_key` (`public_id`),
    UNIQUE INDEX `resident_stays_active_bed_key` (`organization_id`, `pg_id`, `bed_id`, `active_bed_slot`),
    UNIQUE INDEX `resident_stays_active_resident_key` (`organization_id`, `resident_id`, `active_resident_slot`),
    INDEX `resident_stays_organization_id_pg_id_status_idx` (`organization_id`, `pg_id`, `status`),
    INDEX `resident_stays_organization_id_resident_id_start_date_idx` (`organization_id`, `resident_id`, `start_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `residents`
    ADD CONSTRAINT `residents_organization_id_fkey`
    FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `resident_stays`
    ADD CONSTRAINT `resident_stays_organization_id_fkey`
    FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `resident_stays_organization_id_pg_id_fkey`
    FOREIGN KEY (`organization_id`, `pg_id`) REFERENCES `pgs` (`organization_id`, `id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `resident_stays_organization_id_resident_id_fkey`
    FOREIGN KEY (`organization_id`, `resident_id`) REFERENCES `residents` (`organization_id`, `id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `resident_stays_organization_id_pg_id_bed_id_fkey`
    FOREIGN KEY (`organization_id`, `pg_id`, `bed_id`) REFERENCES `beds` (`organization_id`, `pg_id`, `id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
