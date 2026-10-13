ALTER TABLE `security_deposit_accounts`
    ADD COLUMN `ledger_version` INT UNSIGNED NOT NULL DEFAULT 0;

ALTER TABLE `security_deposit_transactions`
    ADD COLUMN `transfer_reference` CHAR(36) NULL,
    ADD INDEX `sec_dep_txn_org_transfer_ref_idx` (`organization_id`, `transfer_reference`);
