ALTER TABLE `platform_invoices`
    DROP INDEX `platform_invoices_organization_period_key`,
    ADD COLUMN `property_id` BIGINT UNSIGNED NULL,
    ADD UNIQUE INDEX `platform_invoices_organization_pg_period_key` (`organization_id`, `property_id`, `period`),
    ADD INDEX `platform_invoices_property_id_idx` (`property_id`);

ALTER TABLE `platform_invoices`
    ADD CONSTRAINT `platform_invoices_property_fkey` FOREIGN KEY (`property_id`) REFERENCES `pgs` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
