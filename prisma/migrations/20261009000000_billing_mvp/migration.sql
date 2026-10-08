CREATE TABLE `stay_rent_rates` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `pg_id` BIGINT UNSIGNED NOT NULL,
    `resident_stay_id` BIGINT UNSIGNED NOT NULL,
    `effective_from` DATE NOT NULL,
    `effective_to` DATE NULL,
    `amount_paise` BIGINT NOT NULL,
    `billing_cycle_type` VARCHAR(20) NOT NULL,
    `billing_day` TINYINT UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `stay_rent_rates_public_id_key` (`public_id`),
    UNIQUE INDEX `stay_rent_rates_resident_stay_id_effective_from_key` (`resident_stay_id`, `effective_from`),
    INDEX `stay_rent_rates_org_pg_effective_idx` (`organization_id`, `pg_id`, `effective_from`, `effective_to`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `invoices` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `pg_id` BIGINT UNSIGNED NOT NULL,
    `resident_stay_id` BIGINT UNSIGNED NOT NULL,
    `invoice_number` VARCHAR(50) NOT NULL,
    `invoice_type` VARCHAR(30) NOT NULL DEFAULT 'RENT',
    `billing_period_start` DATE NOT NULL,
    `billing_period_end` DATE NOT NULL,
    `issue_date` DATE NOT NULL,
    `due_date` DATE NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    `subtotal_paise` BIGINT NOT NULL,
    `total_paise` BIGINT NOT NULL,
    `finalized_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `invoices_public_id_key` (`public_id`),
    UNIQUE INDEX `invoices_organization_id_invoice_number_key` (`organization_id`, `invoice_number`),
    UNIQUE INDEX `invoices_stay_period_type_key` (`resident_stay_id`, `billing_period_start`, `billing_period_end`, `invoice_type`),
    INDEX `invoices_organization_id_pg_id_status_due_date_idx` (`organization_id`, `pg_id`, `status`, `due_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `invoice_items` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `invoice_id` BIGINT UNSIGNED NOT NULL,
    `item_type` VARCHAR(40) NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `quantity` DECIMAL(12, 3) NOT NULL DEFAULT 1,
    `unit_amount_paise` BIGINT NOT NULL,
    `amount_paise` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `invoice_items_invoice_id_idx` (`invoice_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `stay_rent_rates`
    ADD CONSTRAINT `stay_rent_rates_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `stay_rent_rates_organization_id_pg_id_fkey` FOREIGN KEY (`organization_id`, `pg_id`) REFERENCES `pgs` (`organization_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `stay_rent_rates_resident_stay_id_fkey` FOREIGN KEY (`resident_stay_id`) REFERENCES `resident_stays` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `invoices`
    ADD CONSTRAINT `invoices_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `invoices_organization_id_pg_id_fkey` FOREIGN KEY (`organization_id`, `pg_id`) REFERENCES `pgs` (`organization_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `invoices_resident_stay_id_fkey` FOREIGN KEY (`resident_stay_id`) REFERENCES `resident_stays` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `invoice_items`
    ADD CONSTRAINT `invoice_items_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
