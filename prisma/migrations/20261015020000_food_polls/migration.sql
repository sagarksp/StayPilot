CREATE TABLE `meal_types` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `pg_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `display_order` INT NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `meal_types_public_id_key` (`public_id`),
    UNIQUE INDEX `meal_types_pg_id_name_key` (`pg_id`, `name`),
    UNIQUE INDEX `meal_types_organization_id_pg_id_id_key` (`organization_id`, `pg_id`, `id`),
    INDEX `meal_types_organization_id_pg_id_status_display_order_idx` (`organization_id`, `pg_id`, `status`, `display_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `resident_stays`
    ADD UNIQUE INDEX `resident_stays_organization_id_id_key` (`organization_id`, `id`);

CREATE TABLE `food_polls` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `pg_id` BIGINT UNSIGNED NOT NULL,
    `meal_type_id` BIGINT UNSIGNED NOT NULL,
    `meal_date` DATE NOT NULL,
    `opens_at` DATETIME(3) NOT NULL,
    `closes_at` DATETIME(3) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    `created_by` BIGINT UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `food_polls_public_id_key` (`public_id`),
    UNIQUE INDEX `food_polls_pg_id_meal_date_meal_type_id_key` (`pg_id`, `meal_date`, `meal_type_id`),
    UNIQUE INDEX `food_polls_organization_id_id_key` (`organization_id`, `id`),
    INDEX `food_polls_organization_id_pg_id_meal_date_status_idx` (`organization_id`, `pg_id`, `meal_date`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `food_poll_options` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `food_poll_id` BIGINT UNSIGNED NOT NULL,
    `label` VARCHAR(180) NOT NULL,
    `display_order` INT NOT NULL DEFAULT 0,
    UNIQUE INDEX `food_poll_options_public_id_key` (`public_id`),
    UNIQUE INDEX `food_poll_options_food_poll_id_id_key` (`food_poll_id`, `id`),
    INDEX `food_poll_options_food_poll_id_display_order_idx` (`food_poll_id`, `display_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `food_votes` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `food_poll_id` BIGINT UNSIGNED NOT NULL,
    `resident_stay_id` BIGINT UNSIGNED NOT NULL,
    `option_id` BIGINT UNSIGNED NOT NULL,
    `voted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `food_votes_food_poll_id_resident_stay_id_key` (`food_poll_id`, `resident_stay_id`),
    INDEX `food_votes_organization_id_resident_stay_id_voted_at_idx` (`organization_id`, `resident_stay_id`, `voted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `meal_types`
    ADD CONSTRAINT `meal_types_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `meal_types_property_fkey` FOREIGN KEY (`organization_id`, `pg_id`) REFERENCES `pgs` (`organization_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `food_polls`
    ADD CONSTRAINT `food_polls_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `food_polls_property_fkey` FOREIGN KEY (`organization_id`, `pg_id`) REFERENCES `pgs` (`organization_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `food_polls_meal_type_fkey` FOREIGN KEY (`organization_id`, `pg_id`, `meal_type_id`) REFERENCES `meal_types` (`organization_id`, `pg_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `food_polls_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `food_poll_options`
    ADD CONSTRAINT `food_poll_options_poll_fkey` FOREIGN KEY (`food_poll_id`) REFERENCES `food_polls` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `food_votes`
    ADD CONSTRAINT `food_votes_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `food_votes_poll_fkey` FOREIGN KEY (`organization_id`, `food_poll_id`) REFERENCES `food_polls` (`organization_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `food_votes_stay_fkey` FOREIGN KEY (`organization_id`, `resident_stay_id`) REFERENCES `resident_stays` (`organization_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `food_votes_option_fkey` FOREIGN KEY (`food_poll_id`, `option_id`) REFERENCES `food_poll_options` (`food_poll_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;
