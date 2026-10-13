ALTER TABLE `invoices`
    ADD COLUMN `amount_paid_paise` BIGINT NOT NULL DEFAULT 0;

CREATE TABLE `payments` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `invoice_id` BIGINT UNSIGNED NOT NULL,
    `amount_paise` BIGINT NOT NULL,
    `payment_date` DATE NOT NULL,
    `method` VARCHAR(30) NOT NULL,
    `reference` VARCHAR(100) NULL,
    `notes` VARCHAR(500) NULL,
    `recorded_by_name` VARCHAR(180) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `payments_public_id_key` (`public_id`),
    INDEX `payments_invoice_id_payment_date_idx` (`invoice_id`, `payment_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `payments`
    ADD CONSTRAINT `payments_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
