ALTER TABLE `resident_stays`
    ADD COLUMN `lock_in_months` INT UNSIGNED NOT NULL DEFAULT 0,
    ADD COLUMN `lock_in_end_date` DATE NULL;

UPDATE `resident_stays`
SET `status` = 'COMPLETED'
WHERE `status` = 'ENDED';

ALTER TABLE `checkout_processes`
    MODIFY `status` VARCHAR(30) NOT NULL DEFAULT 'NOTICE',
    ADD COLUMN `notice_date` DATE NULL,
    MODIFY `requested_checkout_date` DATE NULL,
    ADD COLUMN `approved_checkout_date` DATE NULL,
    MODIFY `actual_move_out_date` DATE NULL,
    ADD COLUMN `lock_in_override` BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN `lock_in_override_reason` VARCHAR(500) NULL,
    MODIFY `completed_at` DATETIME(3) NULL;
