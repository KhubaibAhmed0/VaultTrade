-- ==============================================================================
-- VaultTrade: Consolidated Production Database Migration Bundle
-- ==============================================================================
-- Consolidates:
--   - 001_initial_schema.sql (Profiles, Lobbies, Credentials, Transactions, Disputes, Messages, Push)
--   - 002_rls_policies.sql (Row Level Security & Security Invariant 1 enforcement)
--   - 003_functions.sql (Fee calculator, Deal completion counters, Auto-release RPC)
--   - New: handover_protocols table (Buyer inspection steps & verification timestamps)
--   - New: PUUID columns and partial unique indexes (Sybil & anti-double-selling resistance)
--
-- Safety: Completely idempotent. Can be executed safely on blank DBs or existing deployments.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. CORE TABLES (Idempotent CREATE TABLE IF NOT EXISTS)
-- ------------------------------------------------------------------------------

-- 2.1 Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  facebook_url TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  banned BOOLEAN NOT NULL DEFAULT FALSE,
  strikes INTEGER NOT NULL DEFAULT 0,
  completed_deals INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 Lobbies Table
CREATE TABLE IF NOT EXISTS public.lobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  riot_id TEXT NOT NULL,
  puuid TEXT,
  seller_id UUID NOT NULL REFERENCES public.profiles(id),
  buyer_id UUID REFERENCES public.profiles(id),
  amount INTEGER NOT NULL CHECK (amount >= 500),
  platform_fee INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'awaiting_payment', 'awaiting_credentials', 'inspecting', 'completed', 'disputed', 'refunded', 'cancelled')
  ),
  release_code_hash TEXT,
  auto_release_at TIMESTAMPTZ,
  evidence_deadline TIMESTAMPTZ,
  payout_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 2.3 Credentials Table (Security Invariant 1: Vaulted credentials)
CREATE TABLE IF NOT EXISTS public.credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL UNIQUE REFERENCES public.lobbies(id) ON DELETE CASCADE,
  riot_email TEXT NOT NULL,
  riot_password TEXT NOT NULL,
  first_email TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  social_logins TEXT,
  notes TEXT,
  puuid TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.4 Transactions Table (Raast P2P verification)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  buyer_raast_trn TEXT,
  buyer_screenshot_url TEXT,
  amount INTEGER NOT NULL,
  admin_verified BOOLEAN NOT NULL DEFAULT FALSE,
  payout_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    payout_status IN ('pending', 'held', 'released', 'refunded')
  ),
  payout_raast_trn TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.5 Disputes Table
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  raised_by UUID NOT NULL REFERENCES public.profiles(id),
  reason TEXT NOT NULL,
  evidence_urls TEXT[] NOT NULL DEFAULT '{}',
  resolution TEXT NOT NULL DEFAULT 'pending' CHECK (
    resolution IN ('pending', 'seller_wins', 'buyer_wins')
  ),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.6 Lobby Messages Table (Sanitized P2P chat)
CREATE TABLE IF NOT EXISTS public.lobby_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.7 Push Subscriptions Table (Web Push API / VAPID)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.8 Handover Protocols Table (NEW: Verification checklist gate)
CREATE TABLE IF NOT EXISTS public.handover_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL UNIQUE REFERENCES public.lobbies(id) ON DELETE CASCADE,
  puuid TEXT,
  step_login_verified BOOLEAN NOT NULL DEFAULT FALSE,
  step_email_changed BOOLEAN NOT NULL DEFAULT FALSE,
  step_password_changed BOOLEAN NOT NULL DEFAULT FALSE,
  step_2fa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  step_sessions_revoked BOOLEAN NOT NULL DEFAULT FALSE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. SCHEMA MIGRATION SAFEGUARDS (For existing databases)
-- ------------------------------------------------------------------------------
ALTER TABLE public.lobbies ADD COLUMN IF NOT EXISTS puuid TEXT;
ALTER TABLE public.credentials ADD COLUMN IF NOT EXISTS puuid TEXT;
ALTER TABLE public.handover_protocols ADD COLUMN IF NOT EXISTS puuid TEXT;

-- ------------------------------------------------------------------------------
-- 4. PERFORMANCE & INTEGRITY INDEXES
-- ------------------------------------------------------------------------------

-- Invariant 5: Unique active lobby per Riot ID (anti-double-selling)
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_riot_id 
ON public.lobbies (riot_id) 
WHERE status NOT IN ('completed', 'refunded', 'cancelled');

-- Invariant 5 Hardening: Unique active lobby per Riot PUUID (prevents rename bypass)
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_puuid 
ON public.lobbies (puuid) 
WHERE puuid IS NOT NULL AND status NOT IN ('completed', 'refunded', 'cancelled');

-- Query & Filter Indexes
CREATE INDEX IF NOT EXISTS idx_lobbies_seller_id ON public.lobbies (seller_id);
CREATE INDEX IF NOT EXISTS idx_lobbies_buyer_id ON public.lobbies (buyer_id);
CREATE INDEX IF NOT EXISTS idx_lobbies_status ON public.lobbies (status);
CREATE INDEX IF NOT EXISTS idx_lobbies_auto_release ON public.lobbies (auto_release_at) WHERE status = 'inspecting';
CREATE INDEX IF NOT EXISTS idx_credentials_lobby_id ON public.credentials (lobby_id);
CREATE INDEX IF NOT EXISTS idx_transactions_lobby_id ON public.transactions (lobby_id);
CREATE INDEX IF NOT EXISTS idx_disputes_lobby_id ON public.disputes (lobby_id);
CREATE INDEX IF NOT EXISTS idx_lobby_messages_lobby_id ON public.lobby_messages (lobby_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_handover_protocols_lobby_id ON public.handover_protocols (lobby_id);
CREATE INDEX IF NOT EXISTS idx_handover_protocols_puuid ON public.handover_protocols (puuid) WHERE puuid IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 5. HELPER FUNCTIONS & TRIGGERS
-- ------------------------------------------------------------------------------

-- 5.1 Admin Authorization Function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2 Platform Fee Calculator
-- 200 PKR on deals < 30,000 PKR; 500 PKR on deals >= 30,000 PKR
CREATE OR REPLACE FUNCTION public.calculate_platform_fee(deal_amount INTEGER)
RETURNS INTEGER AS $$
BEGIN
  IF deal_amount < 30000 THEN
    RETURN 200;
  ELSE
    RETURN 500;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5.3 Lobby Defaults Trigger Function
CREATE OR REPLACE FUNCTION public.set_lobby_defaults()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.platform_fee IS NULL OR NEW.platform_fee = 0 THEN
    NEW.platform_fee := public.calculate_platform_fee(NEW.amount);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_lobby_defaults ON public.lobbies;
CREATE TRIGGER trigger_set_lobby_defaults
BEFORE INSERT ON public.lobbies
FOR EACH ROW
EXECUTE FUNCTION public.set_lobby_defaults();

-- 5.4 Deal Completion Lifecycle Handler
CREATE OR REPLACE FUNCTION public.handle_deal_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    NEW.completed_at := NOW();
    IF NEW.payout_at IS NULL THEN
      NEW.payout_at := NOW() + INTERVAL '36 hours';
    END IF;

    -- Increment seller completed deals
    UPDATE public.profiles
    SET completed_deals = completed_deals + 1
    WHERE id = NEW.seller_id;

    -- Increment buyer completed deals if buyer present
    IF NEW.buyer_id IS NOT NULL THEN
      UPDATE public.profiles
      SET completed_deals = completed_deals + 1
      WHERE id = NEW.buyer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_handle_deal_completion ON public.lobbies;
CREATE TRIGGER trigger_handle_deal_completion
BEFORE UPDATE ON public.lobbies
FOR EACH ROW
EXECUTE FUNCTION public.handle_deal_completion();

-- 5.5 Auto-Release Expired Lobbies Stored Procedure (Invoked by cron worker)
CREATE OR REPLACE FUNCTION public.auto_release_expired_lobbies()
RETURNS INTEGER AS $$
DECLARE
  released_count INTEGER := 0;
BEGIN
  UPDATE public.lobbies
  SET 
    status = 'completed',
    completed_at = NOW(),
    payout_at = NOW() + INTERVAL '36 hours'
  WHERE 
    status = 'inspecting' 
    AND auto_release_at IS NOT NULL 
    AND auto_release_at < NOW();

  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.6 Handover Protocol Updated-At Timestamp Handler
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_handover_protocols_updated_at ON public.handover_protocols;
CREATE TRIGGER trigger_handover_protocols_updated_at
BEFORE UPDATE ON public.handover_protocols
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 5.7 Handover Protocol Completion Evaluator
CREATE OR REPLACE FUNCTION public.verify_handover_protocol_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.step_login_verified AND NEW.step_email_changed AND NEW.step_password_changed AND NEW.step_2fa_enabled THEN
    NEW.completed := TRUE;
    IF NEW.verified_at IS NULL THEN
      NEW.verified_at := NOW();
    END IF;
  ELSE
    NEW.completed := FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_verify_handover_completion ON public.handover_protocols;
CREATE TRIGGER trigger_verify_handover_completion
BEFORE INSERT OR UPDATE ON public.handover_protocols
FOR EACH ROW
EXECUTE FUNCTION public.verify_handover_protocol_completion();

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handover_protocols ENABLE ROW LEVEL SECURITY;

-- 6.1 Profiles Policies
DROP POLICY IF EXISTS "Public profiles are readable by authenticated users" ON public.profiles;
CREATE POLICY "Public profiles are readable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (TRUE);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 6.2 Lobbies Policies
DROP POLICY IF EXISTS "Users can view open lobbies or lobbies they participate in or admins" ON public.lobbies;
CREATE POLICY "Users can view open lobbies or lobbies they participate in or admins"
ON public.lobbies FOR SELECT
TO authenticated
USING (
  status = 'open' 
  OR auth.uid() = seller_id 
  OR auth.uid() = buyer_id 
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Sellers can create lobbies" ON public.lobbies;
CREATE POLICY "Sellers can create lobbies"
ON public.lobbies FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Participants or admins can update lobbies" ON public.lobbies;
CREATE POLICY "Participants or admins can update lobbies"
ON public.lobbies FOR UPDATE
TO authenticated
USING (
  auth.uid() = seller_id 
  OR auth.uid() = buyer_id 
  OR public.is_admin()
)
WITH CHECK (
  public.is_admin()
  OR auth.uid() = seller_id
  OR auth.uid() = buyer_id
);

-- 6.3 Credentials Policies (SECURITY INVARIANT 1: Strict Vaulting)
DROP POLICY IF EXISTS "Seller can insert credentials for their lobby" ON public.credentials;
CREATE POLICY "Seller can insert credentials for their lobby"
ON public.credentials FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lobbies 
    WHERE id = credentials.lobby_id 
    AND seller_id = auth.uid()
  )
);

-- STRICT: ONLY buyer can read credentials. Seller and Admin CANNOT SELECT raw credentials.
DROP POLICY IF EXISTS "Only buyer can read credentials" ON public.credentials;
CREATE POLICY "Only buyer can read credentials"
ON public.credentials FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lobbies 
    WHERE id = credentials.lobby_id 
    AND buyer_id = auth.uid()
  )
);

-- 6.4 Transactions Policies
DROP POLICY IF EXISTS "Lobby participants or admin can read transactions" ON public.transactions;
CREATE POLICY "Lobby participants or admin can read transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lobbies 
    WHERE id = transactions.lobby_id 
    AND (seller_id = auth.uid() OR buyer_id = auth.uid())
  )
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Buyer can insert transaction proof" ON public.transactions;
CREATE POLICY "Buyer can insert transaction proof"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lobbies 
    WHERE id = transactions.lobby_id 
    AND buyer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Only admin can update transaction verification" ON public.transactions;
CREATE POLICY "Only admin can update transaction verification"
ON public.transactions FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 6.5 Disputes Policies
DROP POLICY IF EXISTS "Lobby participants or admin can read disputes" ON public.disputes;
CREATE POLICY "Lobby participants or admin can read disputes"
ON public.disputes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lobbies 
    WHERE id = disputes.lobby_id 
    AND (seller_id = auth.uid() OR buyer_id = auth.uid())
  )
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Lobby participants can raise disputes" ON public.disputes;
CREATE POLICY "Lobby participants can raise disputes"
ON public.disputes FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = raised_by 
  AND EXISTS (
    SELECT 1 FROM public.lobbies 
    WHERE id = disputes.lobby_id 
    AND (seller_id = auth.uid() OR buyer_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Only admin can update disputes" ON public.disputes;
CREATE POLICY "Only admin can update disputes"
ON public.disputes FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 6.6 Lobby Messages Policies
DROP POLICY IF EXISTS "Lobby participants or admin can read messages" ON public.lobby_messages;
CREATE POLICY "Lobby participants or admin can read messages"
ON public.lobby_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lobbies 
    WHERE id = lobby_messages.lobby_id 
    AND (seller_id = auth.uid() OR buyer_id = auth.uid())
  )
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Lobby participants can send messages" ON public.lobby_messages;
CREATE POLICY "Lobby participants can send messages"
ON public.lobby_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id 
  AND EXISTS (
    SELECT 1 FROM public.lobbies 
    WHERE id = lobby_messages.lobby_id 
    AND (seller_id = auth.uid() OR buyer_id = auth.uid())
  )
);

-- 6.7 Push Subscriptions Policies
DROP POLICY IF EXISTS "Users can view their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view their own push subscriptions"
ON public.push_subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can insert their own push subscriptions"
ON public.push_subscriptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete their own push subscriptions"
ON public.push_subscriptions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 6.8 Handover Protocols Policies
DROP POLICY IF EXISTS "Lobby participants or admin can read handover protocols" ON public.handover_protocols;
CREATE POLICY "Lobby participants or admin can read handover protocols"
ON public.handover_protocols FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lobbies 
    WHERE id = handover_protocols.lobby_id 
    AND (seller_id = auth.uid() OR buyer_id = auth.uid())
  )
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Buyer can insert handover protocol" ON public.handover_protocols;
CREATE POLICY "Buyer can insert handover protocol"
ON public.handover_protocols FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lobbies 
    WHERE id = handover_protocols.lobby_id 
    AND buyer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Buyer can update handover protocol" ON public.handover_protocols;
CREATE POLICY "Buyer can update handover protocol"
ON public.handover_protocols FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lobbies 
    WHERE id = handover_protocols.lobby_id 
    AND buyer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lobbies 
    WHERE id = handover_protocols.lobby_id 
    AND buyer_id = auth.uid()
  )
);

-- ------------------------------------------------------------------------------
-- 7. SUPABASE REALTIME REPLICATION CONFIGURATION
-- ------------------------------------------------------------------------------

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY['lobbies', 'lobby_messages', 'transactions', 'disputes', 'handover_protocols'];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = tbl AND schemaname = 'public'
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;
