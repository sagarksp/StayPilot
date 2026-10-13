CREATE TABLE `pg_settings` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `pg_id` BIGINT UNSIGNED NOT NULL,
    `notice_period_days` INT UNSIGNED NOT NULL DEFAULT 30,
    `lock_in_months` INT UNSIGNED NOT NULL DEFAULT 0,
    `food_mode` VARCHAR(20) NOT NULL DEFAULT 'INCLUDED',
    `electricity_mode` VARCHAR(20) NOT NULL DEFAULT 'ROOM_METER',
    `default_electricity_rate_paise` BIGINT NULL,
    `rent_reminder_days` INT UNSIGNED NOT NULL DEFAULT 5,
    `kyc_retention_mode` VARCHAR(30) NOT NULL DEFAULT 'KEEP',
    `kyc_retention_months` INT UNSIGNED NULL,
    `reservation_refund_policy` VARCHAR(30) NOT NULL DEFAULT 'NON_REFUNDABLE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `pg_settings_pg_id_key` (`pg_id`),
    UNIQUE INDEX `pg_settings_organization_id_pg_id_key` (`organization_id`, `pg_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `pg_settings`
    ADD CONSTRAINT `pg_settings_organization_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `pg_settings_property_fkey` FOREIGN KEY (`organization_id`, `pg_id`) REFERENCES `pgs` (`organization_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;
