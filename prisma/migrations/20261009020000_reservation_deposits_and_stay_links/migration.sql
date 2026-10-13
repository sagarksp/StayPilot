ALTER TABLE `resident_stays`
    ADD COLUMN `reservation_id` BIGINT UNSIGNED NULL,
    ADD INDEX `resident_stays_reservation_id_idx` (`reservation_id`),
    ADD CONSTRAINT `resident_stays_reservation_id_fkey` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `payments`
    MODIFY `invoice_id` BIGINT UNSIGNED NULL,
    ADD COLUMN `organization_id` BIGINT UNSIGNED NULL AFTER `public_id`,
    ADD COLUMN `pg_id` BIGINT UNSIGNED NULL AFTER `organization_id`,
    ADD COLUMN `resident_id` BIGINT UNSIGNED NULL AFTER `pg_id`,
    ADD COLUMN `reservation_id` BIGINT UNSIGNED NULL AFTER `invoice_id`,
    ADD COLUMN `resident_stay_id` BIGINT UNSIGNED NULL AFTER `reservation_id`,
    ADD COLUMN `purpose` VARCHAR(30) NOT NULL DEFAULT 'INVOICE' AFTER `resident_stay_id`;

UPDATE `payments` AS p
JOIN `invoices` AS i ON i.`id` = p.`invoice_id`
JOIN `resident_stays` AS s ON s.`id` = i.`resident_stay_id`
SET p.`organization_id` = i.`organization_id`, p.`pg_id` = i.`pg_id`, p.`resident_id` = s.`resident_id`, p.`resident_stay_id` = s.`id`;

ALTER TABLE `payments`
    MODIFY `organization_id` BIGINT UNSIGNED NOT NULL,
    MODIFY `pg_id` BIGINT UNSIGNED NOT NULL,
    MODIFY `resident_id` BIGINT UNSIGNED NOT NULL,
    ADD INDEX `payments_organization_id_pg_id_payment_date_idx` (`organization_id`, `pg_id`, `payment_date`),
    ADD INDEX `payments_reservation_id_idx` (`reservation_id`),
    ADD INDEX `payments_resident_stay_id_payment_date_idx` (`resident_stay_id`, `payment_date`),
    ADD CONSTRAINT `payments_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `payments_organization_id_pg_id_fkey` FOREIGN KEY (`organization_id`, `pg_id`) REFERENCES `pgs` (`organization_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `payments_organization_id_resident_id_fkey` FOREIGN KEY (`organization_id`, `resident_id`) REFERENCES `residents` (`organization_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `payments_reservation_id_fkey` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `payments_resident_stay_id_fkey` FOREIGN KEY (`resident_stay_id`) REFERENCES `resident_stays` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE `security_deposit_accounts` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `pg_id` BIGINT UNSIGNED NOT NULL,
    `resident_stay_id` BIGINT UNSIGNED NOT NULL,
    `required_amount_paise` BIGINT NOT NULL,
    `policy_type` VARCHAR(30) NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `security_deposit_accounts_public_id_key` (`public_id`),
    UNIQUE INDEX `security_deposit_accounts_resident_stay_id_key` (`resident_stay_id`),
    UNIQUE INDEX `security_deposit_accounts_organization_id_id_key` (`organization_id`, `id`),
    INDEX `security_deposit_accounts_organization_id_pg_id_status_idx` (`organization_id`, `pg_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `security_deposit_transactions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `deposit_account_id` BIGINT UNSIGNED NULL,
    `reservation_id` BIGINT UNSIGNED NULL,
    `payment_id` BIGINT UNSIGNED NULL,
    `transaction_type` VARCHAR(30) NOT NULL,
    `amount_paise` BIGINT NOT NULL,
    `description` VARCHAR(500) NULL,
    `created_by` BIGINT UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `security_deposit_transactions_public_id_key` (`public_id`),
    UNIQUE INDEX `security_deposit_transactions_payment_id_key` (`payment_id`),
    INDEX `sec_dep_txn_org_account_created_idx` (`organization_id`, `deposit_account_id`, `created_at`),
    INDEX `security_deposit_transactions_reservation_id_created_at_idx` (`reservation_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `security_deposit_accounts`
    ADD CONSTRAINT `security_deposit_accounts_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `security_deposit_accounts_organization_id_pg_id_fkey` FOREIGN KEY (`organization_id`, `pg_id`) REFERENCES `pgs` (`organization_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `security_deposit_accounts_resident_stay_id_fkey` FOREIGN KEY (`resident_stay_id`) REFERENCES `resident_stays` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `security_deposit_transactions`
    ADD CONSTRAINT `security_deposit_transactions_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `security_deposit_transactions_deposit_account_id_fkey` FOREIGN KEY (`deposit_account_id`) REFERENCES `security_deposit_accounts` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `security_deposit_transactions_reservation_id_fkey` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `security_deposit_transactions_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `security_deposit_transactions_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
