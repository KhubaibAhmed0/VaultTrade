-- Migration 004: VaultRelay Synchronous Handover Protocol & Riot Email Change OTC Gateway

-- 1. Create handover_protocols table
CREATE TABLE IF NOT EXISTS public.handover_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL UNIQUE REFERENCES public.lobbies(id) ON DELETE CASCADE,
  target_email TEXT NOT NULL,
  riot_otp TEXT CHECK (riot_otp IS NULL OR riot_otp ~ '^[0-9]{6}$'),
  otp_requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  otp_expires_at TIMESTAMPTZ NOT NULL,
  google_unlinked BOOLEAN NOT NULL DEFAULT FALSE,
  xbox_unlinked BOOLEAN NOT NULL DEFAULT FALSE,
  psn_unlinked BOOLEAN NOT NULL DEFAULT FALSE,
  twitch_unlinked BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'otp_relayed', 'unlinked', 'escalated_dispute')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for high-performance lookup by lobby
CREATE INDEX IF NOT EXISTS idx_handover_protocols_lobby_id 
ON public.handover_protocols (lobby_id);

-- 2. Enable Row Level Security
ALTER TABLE public.handover_protocols ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies: Ensure only buyer & seller (and admin) can interact
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

CREATE POLICY "Lobby participants can update handover protocol"
ON public.handover_protocols FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lobbies 
    WHERE id = handover_protocols.lobby_id 
    AND (seller_id = auth.uid() OR buyer_id = auth.uid())
  )
  OR public.is_admin()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lobbies 
    WHERE id = handover_protocols.lobby_id 
    AND (seller_id = auth.uid() OR buyer_id = auth.uid())
  )
  OR public.is_admin()
);
