ALTER TABLE `organizations`
    ADD COLUMN `demo_expires_at` DATETIME(3) NULL;

ALTER TABLE `platform_owner_invitations`
    ADD COLUMN `demo_duration_hours` INT NULL;

CREATE TABLE `demo_requests` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `name` VARCHAR(180) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `phone_country_code` VARCHAR(8) NOT NULL,
    `phone_number` VARCHAR(30) NOT NULL,
    `address` VARCHAR(500) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `invitation_id` BIGINT UNSIGNED NULL,
    `reviewed_by_email` VARCHAR(254) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `demo_requests_public_id_key` (`public_id`),
    UNIQUE INDEX `demo_requests_invitation_id_key` (`invitation_id`),
    INDEX `demo_requests_status_created_at_idx` (`status`, `created_at`),
    INDEX `demo_requests_email_created_at_idx` (`email`, `created_at`),
    PRIMARY KEY (`id`),
    CONSTRAINT `demo_requests_invitation_id_fkey` FOREIGN KEY (`invitation_id`) REFERENCES `platform_owner_invitations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
