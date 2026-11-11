-- Input: a Hippo database initialized with the vault migration.
-- Output: saved vault IDs, display names, and root paths in ID order.

SELECT vault_id, display_name, root_path
FROM vault
ORDER BY vault_id;