CREATE TABLE `food_menus` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `pg_id` BIGINT UNSIGNED NOT NULL,
    `title` VARCHAR(160) NULL,
    `valid_from` DATE NOT NULL,
    `valid_to` DATE NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    `created_by` BIGINT UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `published_at` DATETIME(3) NULL,
    UNIQUE INDEX `food_menus_public_id_key` (`public_id`),
    UNIQUE INDEX `food_menus_organization_id_id_key` (`organization_id`, `id`),
    UNIQUE INDEX `food_menus_organization_id_pg_id_id_key` (`organization_id`, `pg_id`, `id`),
    INDEX `food_menus_organization_id_pg_id_status_valid_from_valid_to_idx` (`organization_id`, `pg_id`, `status`, `valid_from`, `valid_to`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `food_menu_items` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `organization_id` BIGINT UNSIGNED NOT NULL,
    `pg_id` BIGINT UNSIGNED NOT NULL,
    `food_menu_id` BIGINT UNSIGNED NOT NULL,
    `meal_type_id` BIGINT UNSIGNED NOT NULL,
    `menu_date` DATE NOT NULL,
    `dish_name` VARCHAR(255) NOT NULL,
    `description` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `food_menu_items_organization_id_pg_id_menu_date_meal_type_id_idx` (`organization_id`, `pg_id`, `menu_date`, `meal_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `food_menus`
    ADD CONSTRAINT `food_menus_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `food_menus_property_fkey` FOREIGN KEY (`organization_id`, `pg_id`) REFERENCES `pgs` (`organization_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `food_menus_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `food_menu_items`
    ADD CONSTRAINT `food_menu_items_menu_fkey` FOREIGN KEY (`organization_id`, `pg_id`, `food_menu_id`) REFERENCES `food_menus` (`organization_id`, `pg_id`, `id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `food_menu_items_meal_type_fkey` FOREIGN KEY (`organization_id`, `pg_id`, `meal_type_id`) REFERENCES `meal_types` (`organization_id`, `pg_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;
