CREATE TABLE `platform_billing_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `currency` CHAR(3) NOT NULL DEFAULT 'INR',
    `monthly_rate` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `updated_by_email` VARCHAR(254) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `platform_invoices` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `period` CHAR(7) NOT NULL,
    `active_pg_count` INTEGER NOT NULL,
    `monthly_rate` DECIMAL(12, 2) NOT NULL,
    `currency` CHAR(3) NOT NULL,
    `total_amount` DECIMAL(14, 2) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    `due_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `platform_invoices_public_id_key` (`public_id`),
    UNIQUE INDEX `platform_invoices_organization_period_key` (`organization_id`, `period`),
    INDEX `platform_invoices_org_status_due_idx` (`organization_id`, `status`, `due_at`),
    INDEX `platform_invoices_period_status_idx` (`period`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `platform_payments` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `invoice_id` BIGINT UNSIGNED NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `method` VARCHAR(30) NOT NULL,
    `reference` VARCHAR(180) NULL,
    `paid_at` DATETIME(3) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `submitted_by_email` VARCHAR(254) NOT NULL,
    `reviewed_by_email` VARCHAR(254) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `note` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `platform_payments_public_id_key` (`public_id`),
    INDEX `platform_payments_invoice_status_created_idx` (`invoice_id`, `status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `platform_invoices`
    ADD CONSTRAINT `platform_invoices_organization_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `platform_payments`
    ADD CONSTRAINT `platform_payments_invoice_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `platform_invoices` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
