-- Customer-facing portal tables: profiles, appliances, loyalty, referral earnings
-- Run in Supabase SQL Editor. Safe to re-run (IF NOT EXISTS throughout).

-- ─── Customer profile (one row per auth user) ──────────────────────────────
CREATE TABLE IF NOT EXISTS customer_profiles (
  user_id        uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name      text        NOT NULL DEFAULT '',
  phone          text        NOT NULL DEFAULT '',
  address_type   text        NOT NULL DEFAULT 'residence'
                               CHECK (address_type IN ('residence', 'office')),
  city           text        NOT NULL DEFAULT '',
  address        text        NOT NULL DEFAULT '',
  loyalty_points integer     NOT NULL DEFAULT 0,
  loyalty_tier   text        NOT NULL DEFAULT 'bronze'
                               CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum')),
  referral_code  text        UNIQUE,
  referred_by    text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Auto-generate an 8-char referral code from user_id on INSERT
CREATE OR REPLACE FUNCTION _gen_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTRING(MD5(NEW.user_id::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customer_referral_code ON customer_profiles;
CREATE TRIGGER trg_customer_referral_code
  BEFORE INSERT ON customer_profiles
  FOR EACH ROW EXECUTE FUNCTION _gen_referral_code();

-- ─── Customer appliances ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_appliances (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand            text        NOT NULL,
  model            text        NOT NULL DEFAULT '',
  category         text        NOT NULL,
  purchase_year    smallint,
  purchase_source  text        NOT NULL DEFAULT 'other'
                                 CHECK (purchase_source IN ('tajallis', 'other')),
  last_serviced_at date,
  is_active        boolean     NOT NULL DEFAULT true,
  notes            text        NOT NULL DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_appliances_user_idx
  ON customer_appliances (user_id, is_active, created_at DESC);

-- ─── Loyalty points ledger ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         text        NOT NULL
                             CHECK (type IN (
                               'earn_purchase', 'earn_referral', 'earn_profile',
                               'earn_bonus', 'earn_review', 'redeem'
                             )),
  points       integer     NOT NULL,
  reference_id text,
  description  text        NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loyalty_user_idx
  ON loyalty_transactions (user_id, created_at DESC);

-- ─── Referral earnings tracker ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_earnings (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_email    text,
  order_id          text,
  order_amount      numeric(12,2),
  commission_rate   numeric(5,4) NOT NULL DEFAULT 0.02,
  commission_amount numeric(12,2),
  status            text        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'confirmed', 'paid')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referral_earnings_user_idx
  ON referral_earnings (referrer_user_id, created_at DESC);

-- ─── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE customer_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_appliances  ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_earnings    ENABLE ROW LEVEL SECURITY;

-- Each user can read/write only their own rows
DROP POLICY IF EXISTS "cp_self"  ON customer_profiles;
DROP POLICY IF EXISTS "ca_self"  ON customer_appliances;
DROP POLICY IF EXISTS "lt_self"  ON loyalty_transactions;
DROP POLICY IF EXISTS "re_self"  ON referral_earnings;

CREATE POLICY "cp_self" ON customer_profiles
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "ca_self" ON customer_appliances
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "lt_self" ON loyalty_transactions
  USING (user_id = auth.uid());

CREATE POLICY "re_self" ON referral_earnings
  USING (referrer_user_id = auth.uid());

-- Admin (authenticated) can read all (service staff need full visibility)
DROP POLICY IF EXISTS "cp_admin"  ON customer_profiles;
DROP POLICY IF EXISTS "ca_admin"  ON customer_appliances;
DROP POLICY IF EXISTS "lt_admin"  ON loyalty_transactions;
DROP POLICY IF EXISTS "re_admin"  ON referral_earnings;

CREATE POLICY "cp_admin" ON customer_profiles
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "ca_admin" ON customer_appliances
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "lt_admin" ON loyalty_transactions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "re_admin" ON referral_earnings
  FOR ALL USING (auth.role() = 'service_role');

-- ─── Loyalty tier auto-update function ─────────────────────────────────────
-- Call this after any loyalty_transactions insert to keep tier in sync.
CREATE OR REPLACE FUNCTION sync_loyalty_tier(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  total_pts integer;
  new_tier  text;
BEGIN
  SELECT COALESCE(SUM(points), 0) INTO total_pts
    FROM loyalty_transactions WHERE user_id = p_user_id;

  new_tier := CASE
    WHEN total_pts >= 15000 THEN 'platinum'
    WHEN total_pts >= 5000  THEN 'gold'
    WHEN total_pts >= 1000  THEN 'silver'
    ELSE 'bronze'
  END;

  UPDATE customer_profiles
    SET loyalty_points = total_pts,
        loyalty_tier   = new_tier,
        updated_at     = now()
  WHERE user_id = p_user_id;
END;
$$;
