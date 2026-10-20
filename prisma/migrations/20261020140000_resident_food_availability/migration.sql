ALTER TABLE `food_votes`
    ADD COLUMN `suggestion` VARCHAR(500) NULL;

CREATE TABLE `resident_food_unavailability` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `pg_id` BIGINT UNSIGNED NOT NULL,
    `resident_stay_id` BIGINT UNSIGNED NOT NULL,
    `starts_on` DATE NOT NULL,
    `ends_on` DATE NOT NULL,
    `cancelled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `resident_food_unavailability_public_id_key` (`public_id`),
    INDEX `resident_food_unavailability_property_range_idx` (`organization_id`, `pg_id`, `starts_on`, `ends_on`, `cancelled_at`),
    INDEX `resident_food_unavailability_stay_range_idx` (`organization_id`, `resident_stay_id`, `starts_on`, `ends_on`, `cancelled_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `resident_food_unavailability`
    ADD CONSTRAINT `resident_food_unavailability_organization_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `resident_food_unavailability_property_fkey` FOREIGN KEY (`organization_id`, `pg_id`) REFERENCES `pgs` (`organization_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `resident_food_unavailability_stay_fkey` FOREIGN KEY (`organization_id`, `resident_stay_id`) REFERENCES `resident_stays` (`organization_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;
