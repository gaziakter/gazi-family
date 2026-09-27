
-- Preserve existing access while splitting transactions and print permissions.
UPDATE "Role" SET permissions = ARRAY(SELECT DISTINCT p FROM unnest(ARRAY['overview.read']::text[] || ARRAY(SELECT unnest(CASE WHEN old LIKE 'transactions.%' THEN ARRAY['income.' || split_part(old,'.',2),'expense.' || split_part(old,'.',2)] ELSE ARRAY[old] END) FROM unnest(permissions) AS old) || CASE WHEN 'reports.export' = ANY(permissions) THEN ARRAY['reports.print']::text[] ELSE ARRAY[]::text[] END) AS p);
