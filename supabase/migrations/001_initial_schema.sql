-- Migration 001: Initial Schema for VaultTrade

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
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

-- 2. Lobbies Table
CREATE TABLE IF NOT EXISTS public.lobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  riot_id TEXT NOT NULL,
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

-- Unique active lobby per Riot ID (Invariant 7: prevents double-selling)
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_riot_id 
ON public.lobbies (riot_id) 
WHERE status NOT IN ('completed', 'refunded', 'cancelled');

-- 3. Credentials Table
CREATE TABLE IF NOT EXISTS public.credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL UNIQUE REFERENCES public.lobbies(id) ON DELETE CASCADE,
  riot_email TEXT NOT NULL,
  riot_password TEXT NOT NULL,
  first_email TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  social_logins TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Transactions Table
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

-- 5. Disputes Table
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

-- 6. Lobby Messages Table
CREATE TABLE IF NOT EXISTS public.lobby_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Push Subscriptions Table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
