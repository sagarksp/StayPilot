ALTER TABLE `payments`
    ADD COLUMN `transaction_type` VARCHAR(20) NOT NULL DEFAULT 'PAYMENT',
    ADD COLUMN `original_payment_id` BIGINT UNSIGNED NULL,
    ADD COLUMN `idempotency_key` VARCHAR(100) NULL,
    ADD COLUMN `request_hash` CHAR(64) NULL,
    ADD UNIQUE INDEX `payments_organization_id_idempotency_key_key` (`organization_id`, `idempotency_key`),
    ADD INDEX `payments_organization_id_original_payment_id_idx` (`organization_id`, `original_payment_id`),
    ADD CONSTRAINT `payments_original_payment_fkey`
        FOREIGN KEY (`original_payment_id`) REFERENCES `payments` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE;
