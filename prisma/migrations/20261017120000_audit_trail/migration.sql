CREATE TABLE `audit_logs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `pg_id` BIGINT UNSIGNED NULL,
    `actor_user_public_id` CHAR(36) NULL,
    `actor_name` VARCHAR(180) NOT NULL,
    `action_code` VARCHAR(80) NOT NULL,
    `entity_type` VARCHAR(60) NOT NULL,
    `entity_public_id` CHAR(36) NULL,
    `summary` VARCHAR(500) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `audit_logs_public_id_key` (`public_id`),
    INDEX `audit_logs_organization_id_created_at_idx` (`organization_id`, `created_at`),
    INDEX `audit_logs_organization_id_pg_id_created_at_idx` (`organization_id`, `pg_id`, `created_at`),
    INDEX `audit_logs_organization_id_entity_type_entity_public_id_idx` (`organization_id`, `entity_type`, `entity_public_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `audit_logs`
    ADD CONSTRAINT `audit_logs_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `audit_logs_property_fkey` FOREIGN KEY (`organization_id`, `pg_id`) REFERENCES `pgs` (`organization_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;
