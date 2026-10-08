-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `name` VARCHAR(180) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'INVITED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_public_id_key`(`public_id`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_identities` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(180) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `email_verified` BOOLEAN NOT NULL DEFAULT false,
    `image` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `auth_identities_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_sessions` (
    `id` VARCHAR(36) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `ip_address` VARCHAR(128) NULL,
    `user_agent` TEXT NULL,
    `user_id` VARCHAR(36) NOT NULL,

    UNIQUE INDEX `auth_sessions_token_key`(`token`),
    INDEX `auth_sessions_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_accounts` (
    `id` VARCHAR(36) NOT NULL,
    `account_id` VARCHAR(255) NOT NULL,
    `provider_id` VARCHAR(100) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `access_token` TEXT NULL,
    `refresh_token` TEXT NULL,
    `id_token` TEXT NULL,
    `access_token_expires_at` DATETIME(3) NULL,
    `refresh_token_expires_at` DATETIME(3) NULL,
    `scope` TEXT NULL,
    `password` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `auth_accounts_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_verifications` (
    `id` VARCHAR(36) NOT NULL,
    `identifier` VARCHAR(255) NOT NULL,
    `value` TEXT NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `auth_verifications_identifier_idx`(`identifier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organizations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `timezone` VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `organizations_public_id_key`(`public_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization_memberships` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `organization_memberships_public_id_key`(`public_id`),
    UNIQUE INDEX `organization_memberships_organization_id_user_id_key`(`organization_id`, `user_id`),
    UNIQUE INDEX `organization_memberships_organization_id_id_key`(`organization_id`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `membership_roles` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `membership_id` BIGINT UNSIGNED NOT NULL,
    `role_code` VARCHAR(30) NOT NULL,

    UNIQUE INDEX `membership_roles_membership_id_role_code_key`(`membership_id`, `role_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `manager_pg_assignments` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `membership_id` BIGINT UNSIGNED NOT NULL,
    `pg_id` BIGINT UNSIGNED NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    UNIQUE INDEX `manager_pg_assignments_membership_id_pg_id_key`(`membership_id`, `pg_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pgs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(180) NOT NULL,
    `code` VARCHAR(50) NULL,
    `address_line1` VARCHAR(255) NOT NULL,
    `address_line2` VARCHAR(255) NULL,
    `city` VARCHAR(100) NOT NULL,
    `state` VARCHAR(100) NOT NULL,
    `postal_code` VARCHAR(20) NOT NULL,
    `contact_phone` VARCHAR(30) NULL,
    `contact_email` VARCHAR(254) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pgs_public_id_key`(`public_id`),
    INDEX `pgs_organization_id_status_idx`(`organization_id`, `status`),
    UNIQUE INDEX `pgs_organization_id_id_key`(`organization_id`, `id`),
    UNIQUE INDEX `pgs_organization_id_code_key`(`organization_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `floors` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `pg_id` BIGINT UNSIGNED NOT NULL,
    `floor_name` VARCHAR(100) NOT NULL,
    `floor_number` INTEGER NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `floors_public_id_key`(`public_id`),
    INDEX `floors_organization_id_pg_id_status_idx`(`organization_id`, `pg_id`, `status`),
    UNIQUE INDEX `floors_organization_id_pg_id_id_key`(`organization_id`, `pg_id`, `id`),
    UNIQUE INDEX `floors_pg_id_floor_name_key`(`pg_id`, `floor_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rooms` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `pg_id` BIGINT UNSIGNED NOT NULL,
    `floor_id` BIGINT UNSIGNED NOT NULL,
    `room_number` VARCHAR(50) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `rooms_public_id_key`(`public_id`),
    INDEX `rooms_organization_id_pg_id_floor_id_idx`(`organization_id`, `pg_id`, `floor_id`),
    UNIQUE INDEX `rooms_organization_id_pg_id_id_key`(`organization_id`, `pg_id`, `id`),
    UNIQUE INDEX `rooms_pg_id_room_number_key`(`pg_id`, `room_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `beds` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `pg_id` BIGINT UNSIGNED NOT NULL,
    `floor_id` BIGINT UNSIGNED NOT NULL,
    `room_id` BIGINT UNSIGNED NOT NULL,
    `bed_label` VARCHAR(50) NOT NULL,
    `operational_status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `beds_public_id_key`(`public_id`),
    INDEX `beds_organization_id_pg_id_room_id_operational_status_idx`(`organization_id`, `pg_id`, `room_id`, `operational_status`),
    UNIQUE INDEX `beds_pg_id_room_id_bed_label_key`(`pg_id`, `room_id`, `bed_label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `auth_sessions` ADD CONSTRAINT `auth_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `auth_identities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth_accounts` ADD CONSTRAINT `auth_accounts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `auth_identities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_memberships` ADD CONSTRAINT `organization_memberships_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_memberships` ADD CONSTRAINT `organization_memberships_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `membership_roles` ADD CONSTRAINT `membership_roles_membership_id_fkey` FOREIGN KEY (`membership_id`) REFERENCES `organization_memberships`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manager_pg_assignments` ADD CONSTRAINT `manager_pg_assignments_organization_id_membership_id_fkey` FOREIGN KEY (`organization_id`, `membership_id`) REFERENCES `organization_memberships`(`organization_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manager_pg_assignments` ADD CONSTRAINT `manager_pg_assignments_organization_id_pg_id_fkey` FOREIGN KEY (`organization_id`, `pg_id`) REFERENCES `pgs`(`organization_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pgs` ADD CONSTRAINT `pgs_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `floors` ADD CONSTRAINT `floors_organization_id_pg_id_fkey` FOREIGN KEY (`organization_id`, `pg_id`) REFERENCES `pgs`(`organization_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `floors` ADD CONSTRAINT `floors_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rooms` ADD CONSTRAINT `rooms_organization_id_pg_id_fkey` FOREIGN KEY (`organization_id`, `pg_id`) REFERENCES `pgs`(`organization_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rooms` ADD CONSTRAINT `rooms_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rooms` ADD CONSTRAINT `rooms_organization_id_pg_id_floor_id_fkey` FOREIGN KEY (`organization_id`, `pg_id`, `floor_id`) REFERENCES `floors`(`organization_id`, `pg_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `beds` ADD CONSTRAINT `beds_organization_id_pg_id_fkey` FOREIGN KEY (`organization_id`, `pg_id`) REFERENCES `pgs`(`organization_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `beds` ADD CONSTRAINT `beds_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `beds` ADD CONSTRAINT `beds_organization_id_pg_id_floor_id_fkey` FOREIGN KEY (`organization_id`, `pg_id`, `floor_id`) REFERENCES `floors`(`organization_id`, `pg_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `beds` ADD CONSTRAINT `beds_organization_id_pg_id_room_id_fkey` FOREIGN KEY (`organization_id`, `pg_id`, `room_id`) REFERENCES `rooms`(`organization_id`, `pg_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;
