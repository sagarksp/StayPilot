CREATE TABLE `electricity_meters` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `pg_id` BIGINT UNSIGNED NOT NULL,
    `scope_type` VARCHAR(20) NOT NULL,
    `room_id` BIGINT UNSIGNED NULL,
    `floor_id` BIGINT UNSIGNED NULL,
    `meter_number` VARCHAR(100) NOT NULL,
    `installed_on` DATE NULL,
    `retired_on` DATE NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `electricity_meters_public_id_key` (`public_id`),
    UNIQUE INDEX `electricity_meters_property_number_key` (`organization_id`, `pg_id`, `meter_number`),
    INDEX `electricity_meters_organization_id_pg_id_status_idx` (`organization_id`, `pg_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `meter_readings` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `meter_id` BIGINT UNSIGNED NOT NULL,
    `reading_value` DECIMAL(14,3) NOT NULL,
    `reading_at` DATETIME(3) NOT NULL,
    `recorded_by` BIGINT UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `meter_readings_meter_id_reading_at_key` (`meter_id`, `reading_at`),
    INDEX `meter_readings_organization_id_meter_id_reading_at_idx` (`organization_id`, `meter_id`, `reading_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `electricity_bills` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `pg_id` BIGINT UNSIGNED NOT NULL,
    `meter_id` BIGINT UNSIGNED NULL,
    `billing_mode` VARCHAR(20) NOT NULL,
    `period_start` DATE NOT NULL,
    `period_end` DATE NOT NULL,
    `previous_reading_id` BIGINT UNSIGNED NULL,
    `current_reading_id` BIGINT UNSIGNED NULL,
    `units_consumed` DECIMAL(14,3) NULL,
    `unit_rate_paise` BIGINT NULL,
    `total_amount_paise` BIGINT NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    `created_by` BIGINT UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finalized_at` DATETIME(3) NULL,
    UNIQUE INDEX `electricity_bills_public_id_key` (`public_id`),
    UNIQUE INDEX `electricity_bills_meter_period_key` (`meter_id`, `period_start`, `period_end`),
    INDEX `electricity_bills_organization_id_pg_id_status_period_end_idx` (`organization_id`, `pg_id`, `status`, `period_end`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `electricity_allocations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `electricity_bill_id` BIGINT UNSIGNED NOT NULL,
    `resident_stay_id` BIGINT UNSIGNED NOT NULL,
    `occupied_days` INT UNSIGNED NULL,
    `calculated_amount_paise` BIGINT NOT NULL,
    `final_amount_paise` BIGINT NOT NULL,
    `override_reason` VARCHAR(500) NULL,
    `overridden_by` BIGINT UNSIGNED NULL,
    `invoice_item_id` BIGINT UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `electricity_allocations_public_id_key` (`public_id`),
    UNIQUE INDEX `electricity_allocations_bill_stay_key` (`electricity_bill_id`, `resident_stay_id`),
    UNIQUE INDEX `electricity_allocations_invoice_item_id_key` (`invoice_item_id`),
    INDEX `electricity_allocations_organization_id_resident_stay_id_idx` (`organization_id`, `resident_stay_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `electricity_meters`
    ADD CONSTRAINT `electricity_meters_org_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `electricity_meters_property_fkey` FOREIGN KEY (`organization_id`, `pg_id`) REFERENCES `pgs` (`organization_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `electricity_meters_room_fkey` FOREIGN KEY (`organization_id`, `pg_id`, `room_id`) REFERENCES `rooms` (`organization_id`, `pg_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `electricity_meters_floor_fkey` FOREIGN KEY (`organization_id`, `pg_id`, `floor_id`) REFERENCES `floors` (`organization_id`, `pg_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `meter_readings`
    ADD CONSTRAINT `meter_readings_org_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `meter_readings_meter_fkey` FOREIGN KEY (`meter_id`) REFERENCES `electricity_meters` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `meter_readings_recorder_fkey` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `electricity_bills`
    ADD CONSTRAINT `electricity_bills_org_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `electricity_bills_property_fkey` FOREIGN KEY (`organization_id`, `pg_id`) REFERENCES `pgs` (`organization_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `electricity_bills_meter_fkey` FOREIGN KEY (`meter_id`) REFERENCES `electricity_meters` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `electricity_bills_previous_reading_fkey` FOREIGN KEY (`previous_reading_id`) REFERENCES `meter_readings` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `electricity_bills_current_reading_fkey` FOREIGN KEY (`current_reading_id`) REFERENCES `meter_readings` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `electricity_bills_creator_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `electricity_allocations`
    ADD CONSTRAINT `electricity_allocations_org_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `electricity_allocations_bill_fkey` FOREIGN KEY (`electricity_bill_id`) REFERENCES `electricity_bills` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `electricity_allocations_stay_fkey` FOREIGN KEY (`resident_stay_id`) REFERENCES `resident_stays` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `electricity_allocations_overrider_fkey` FOREIGN KEY (`overridden_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `electricity_allocations_invoice_item_fkey` FOREIGN KEY (`invoice_item_id`) REFERENCES `invoice_items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
