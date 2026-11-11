-- Subscription / payg providers: two new columns.
-- billing_model: "payg" | "subscription" | "both" (NULL = per-token only)
-- plans: JSON array of {name, price, note}
ALTER TABLE providers ADD COLUMN billing_model TEXT;
ALTER TABLE providers ADD COLUMN plans TEXT;
