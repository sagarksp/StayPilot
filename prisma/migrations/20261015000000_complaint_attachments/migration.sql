CREATE TABLE `complaint_attachments` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `complaint_id` BIGINT UNSIGNED NOT NULL,
    `uploaded_by` BIGINT UNSIGNED NOT NULL,
    `object_key` VARCHAR(512) NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `content_type` VARCHAR(100) NOT NULL,
    `byte_size` INT UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `complaint_attachments_public_id_key` (`public_id`),
    UNIQUE INDEX `complaint_attachments_object_key_key` (`object_key`),
    INDEX `complaint_attachments_complaint_id_created_at_idx` (`complaint_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `complaint_attachments`
    ADD CONSTRAINT `complaint_attachments_complaint_id_fkey` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `complaint_attachments_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
