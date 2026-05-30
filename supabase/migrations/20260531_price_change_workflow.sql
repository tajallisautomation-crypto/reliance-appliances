-- ============================================================
-- Price change approval workflow — 2026-05-31
--
-- Adds a request-and-approval layer on top of the existing
-- pricing governance tab. Price changes should not be applied
-- directly by sales or finance staff without owner/admin sign-off.
--
-- Tables:
--   price_change_requests  — proposed changes awaiting approval
--
-- Roles allowed to PROPOSE: owner, admin, sales, finance
-- Roles allowed to APPROVE: owner, admin
-- ============================================================

CREATE TABLE IF NOT EXISTS public.price_change_requests (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id      uuid        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name    text        NOT NULL,   -- snapshot at time of request (denorm for display)
  product_brand   text        NOT NULL,
  product_model   text        NOT NULL,

  -- What is changing
  field_name      text        NOT NULL
    CHECK (field_name IN ('cash_floor','retail_price','cost_price')),

  old_value       numeric(12,2),          -- snapshot of current value
  proposed_value  numeric(12,2) NOT NULL,

  -- Reason
  reason          text        NOT NULL,

  -- Who proposed
  proposed_by     text        NOT NULL,   -- staff email
  proposed_at     timestamptz NOT NULL DEFAULT now(),

  -- Approval
  status          text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','applied')),

  reviewed_by     text,                   -- staff email of approver/rejecter
  reviewed_at     timestamptz,
  review_note     text,

  -- Applied
  applied_at      timestamptz,

  -- Margin impact snapshot (calculated at proposal time)
  old_margin_pct  numeric(6,2),
  new_margin_pct  numeric(6,2),

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.price_change_requests IS
  'Price change proposals submitted by staff, approved or rejected by owner/admin before being applied to the products table.';

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_price_change_requests_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_price_change_requests_updated_at ON public.price_change_requests;
CREATE TRIGGER trg_price_change_requests_updated_at
  BEFORE UPDATE ON public.price_change_requests
  FOR EACH ROW EXECUTE FUNCTION update_price_change_requests_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS pcr_product_id_idx  ON public.price_change_requests (product_id);
CREATE INDEX IF NOT EXISTS pcr_status_idx       ON public.price_change_requests (status);
CREATE INDEX IF NOT EXISTS pcr_proposed_at_idx  ON public.price_change_requests (proposed_at DESC);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.price_change_requests ENABLE ROW LEVEL SECURITY;

-- Authenticated staff can read all requests
CREATE POLICY "staff read price change requests"
  ON public.price_change_requests FOR SELECT
  TO authenticated USING (true);

-- Authenticated staff can insert (propose)
CREATE POLICY "staff create price change requests"
  ON public.price_change_requests FOR INSERT
  TO authenticated WITH CHECK (true);

-- Authenticated staff can update (approve / mark applied)
CREATE POLICY "staff update price change requests"
  ON public.price_change_requests FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ── Companion: price change applied → audit log ──────────────────────────────
-- When a price_change_request is applied, log it in audit_log automatically.
CREATE OR REPLACE FUNCTION log_applied_price_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'applied' AND OLD.status = 'approved' THEN
    INSERT INTO public.audit_log (action, entity, entity_id, details, performed_by, performed_at)
    VALUES (
      'price_change_applied',
      'product',
      NEW.product_id::text,
      jsonb_build_object(
        'field',       NEW.field_name,
        'old_value',   NEW.old_value,
        'new_value',   NEW.proposed_value,
        'reason',      NEW.reason,
        'proposed_by', NEW.proposed_by,
        'approved_by', NEW.reviewed_by
      ),
      NEW.reviewed_by,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_applied_price_change ON public.price_change_requests;
CREATE TRIGGER trg_log_applied_price_change
  AFTER UPDATE ON public.price_change_requests
  FOR EACH ROW EXECUTE FUNCTION log_applied_price_change();

-- ── View: pending requests with product context ──────────────────────────────
CREATE OR REPLACE VIEW public.pending_price_changes AS
  SELECT
    pcr.*,
    p.category,
    p.cash_floor            AS current_cash_floor,
    p.retail_price          AS current_retail,
    p.cost_price            AS current_cost,
    p.stock_status
  FROM public.price_change_requests pcr
  JOIN public.products p ON p.id = pcr.product_id
  WHERE pcr.status = 'pending'
  ORDER BY pcr.proposed_at DESC;

ALTER VIEW public.pending_price_changes OWNER TO postgres;
