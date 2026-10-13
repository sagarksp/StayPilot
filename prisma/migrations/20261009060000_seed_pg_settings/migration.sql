INSERT INTO `pg_settings` (`organization_id`, `pg_id`, `updated_at`)
SELECT p.`organization_id`, p.`id`, CURRENT_TIMESTAMP(3)
FROM `pgs` AS p
LEFT JOIN `pg_settings` AS s ON s.`pg_id` = p.`id`
WHERE s.`id` IS NULL;
