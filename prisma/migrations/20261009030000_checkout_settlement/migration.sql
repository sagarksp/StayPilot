CREATE TABLE `checkout_processes` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `pg_id` BIGINT UNSIGNED NOT NULL,
    `resident_stay_id` BIGINT UNSIGNED NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
    `requested_checkout_date` DATE NOT NULL,
    `actual_move_out_date` DATE NOT NULL,
    `created_by` BIGINT UNSIGNED NOT NULL,
    `completed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `checkout_processes_public_id_key` (`public_id`),
    INDEX `checkout_processes_org_pg_status_idx` (`organization_id`, `pg_id`, `status`),
    INDEX `checkout_processes_stay_status_idx` (`resident_stay_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `checkout_settlements` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `checkout_process_id` BIGINT UNSIGNED NOT NULL,
    `security_deposit_balance_paise` BIGINT NOT NULL DEFAULT 0,
    `total_dues_paise` BIGINT NOT NULL DEFAULT 0,
    `total_deductions_paise` BIGINT NOT NULL DEFAULT 0,
    `refund_amount_paise` BIGINT NOT NULL DEFAULT 0,
    `final_payable_paise` BIGINT NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'SETTLED',
    `finalized_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `settled_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `checkout_settlements_public_id_key` (`public_id`),
    UNIQUE INDEX `checkout_settlements_process_id_key` (`checkout_process_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `checkout_settlement_items` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `checkout_settlement_id` BIGINT UNSIGNED NOT NULL,
    `item_type` VARCHAR(40) NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `amount_paise` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `checkout_settlement_items_settlement_id_idx` (`checkout_settlement_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `checkout_processes`
    ADD CONSTRAINT `checkout_processes_org_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `checkout_processes_property_fkey` FOREIGN KEY (`organization_id`, `pg_id`) REFERENCES `pgs` (`organization_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `checkout_processes_stay_fkey` FOREIGN KEY (`resident_stay_id`) REFERENCES `resident_stays` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `checkout_processes_creator_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `checkout_settlements`
    ADD CONSTRAINT `checkout_settlements_process_fkey` FOREIGN KEY (`checkout_process_id`) REFERENCES `checkout_processes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `checkout_settlement_items`
    ADD CONSTRAINT `checkout_settlement_items_settlement_fkey` FOREIGN KEY (`checkout_settlement_id`) REFERENCES `checkout_settlements` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
