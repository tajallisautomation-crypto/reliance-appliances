-- Add warranty sticker fields to customer_appliances
-- Mirrors the Product Support & Warranty Sticker schema:
-- serial no, delivery/installation dates, warranty window, installer, sales rep, area

ALTER TABLE customer_appliances
  ADD COLUMN IF NOT EXISTS serial_no           text        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivery_date       date        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS installation_date   date        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS warranty_start_date date        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS warranty_end_date   date        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS installer_name      text        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sales_rep           text        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS area_location       text        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivery_checklist  jsonb       DEFAULT NULL;
  -- delivery_checklist shape: { delivered: bool, installed: bool, demo_given: bool, warranty_card: bool, qc_checked: bool }
