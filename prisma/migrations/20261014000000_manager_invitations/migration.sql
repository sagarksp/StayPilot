CREATE TABLE `user_invitations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `role_code` VARCHAR(30) NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `accepted_at` DATETIME(3) NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `user_invitations_public_id_key` (`public_id`),
    UNIQUE INDEX `user_invitations_token_hash_key` (`token_hash`),
    UNIQUE INDEX `user_invitations_organization_id_id_key` (`organization_id`, `id`),
    INDEX `user_invites_org_role_exp_idx` (`organization_id`, `role_code`, `accepted_at`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `user_invitation_pgs` (
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `invitation_id` BIGINT UNSIGNED NOT NULL,
    `pg_id` BIGINT UNSIGNED NOT NULL,
    INDEX `user_invitation_pgs_organization_id_pg_id_idx` (`organization_id`, `pg_id`),
    PRIMARY KEY (`organization_id`, `invitation_id`, `pg_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `user_invitations`
    ADD CONSTRAINT `user_invitations_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `user_invitations_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `user_invitation_pgs`
    ADD CONSTRAINT `user_invitation_pgs_organization_id_invitation_id_fkey` FOREIGN KEY (`organization_id`, `invitation_id`) REFERENCES `user_invitations` (`organization_id`, `id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `user_invitation_pgs_organization_id_pg_id_fkey` FOREIGN KEY (`organization_id`, `pg_id`) REFERENCES `pgs` (`organization_id`, `id`) ON DELETE CASCADE ON UPDATE CASCADE;
