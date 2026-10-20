CREATE TABLE `resident_documents` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `resident_id` BIGINT UNSIGNED NOT NULL,
    `pg_id` BIGINT UNSIGNED NOT NULL,
    `uploaded_by` BIGINT UNSIGNED NOT NULL,
    `reviewed_by` BIGINT UNSIGNED NULL,
    `document_type` VARCHAR(40) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `object_key` VARCHAR(512) NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `content_type` VARCHAR(100) NOT NULL,
    `byte_size` INTEGER UNSIGNED NOT NULL,
    `review_note` VARCHAR(500) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `resident_documents_public_id_key` (`public_id`),
    UNIQUE INDEX `resident_documents_object_key_key` (`object_key`),
    INDEX `resident_documents_resident_status_idx` (`organization_id`, `pg_id`, `resident_id`, `status`, `created_at`),
    INDEX `resident_documents_type_status_idx` (`organization_id`, `document_type`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `resident_documents`
    ADD CONSTRAINT `resident_documents_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `resident_documents_resident_fkey` FOREIGN KEY (`organization_id`, `resident_id`) REFERENCES `residents` (`organization_id`, `id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `resident_documents_property_fkey` FOREIGN KEY (`organization_id`, `pg_id`) REFERENCES `pgs` (`organization_id`, `id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `resident_documents_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `resident_documents_reviewed_by_fkey` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
