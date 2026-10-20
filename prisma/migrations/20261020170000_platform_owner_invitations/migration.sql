CREATE TABLE `platform_owner_invitations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `owner_name` VARCHAR(180) NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `accepted_at` DATETIME(3) NULL,
    `created_by_email` VARCHAR(254) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `platform_owner_invitations_public_id_key` (`public_id`),
    UNIQUE INDEX `platform_owner_invitations_token_hash_key` (`token_hash`),
    INDEX `platform_owner_invitations_email_status_exp_idx` (`email`, `accepted_at`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
