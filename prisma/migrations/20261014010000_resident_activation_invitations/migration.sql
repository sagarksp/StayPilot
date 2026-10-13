ALTER TABLE `user_invitations`
    ADD COLUMN `resident_id` BIGINT UNSIGNED NULL,
    ADD INDEX `user_invitations_organization_id_resident_id_idx` (`organization_id`, `resident_id`),
    ADD CONSTRAINT `user_invitations_organization_id_resident_id_fkey`
        FOREIGN KEY (`organization_id`, `resident_id`)
        REFERENCES `residents` (`organization_id`, `id`)
        ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `organization_memberships`
    ADD COLUMN `resident_id` BIGINT UNSIGNED NULL,
    ADD UNIQUE INDEX `organization_memberships_organization_id_resident_id_key` (`organization_id`, `resident_id`),
    ADD CONSTRAINT `organization_memberships_organization_id_resident_id_fkey`
        FOREIGN KEY (`organization_id`, `resident_id`)
        REFERENCES `residents` (`organization_id`, `id`)
        ON DELETE RESTRICT ON UPDATE CASCADE;
