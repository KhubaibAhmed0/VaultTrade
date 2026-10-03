-- ============================================================================
-- Migration: 006_evidence_clock_and_release_limits.sql
-- Description:
--   1. Adds release_code_attempts and release_attempt_lockout_until to lobbies
--   2. Updates dispute evidence window default to 90 minutes (load-shedding protection)
-- ============================================================================

ALTER TABLE public.lobbies
  ADD COLUMN IF NOT EXISTS release_code_attempts INT DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS release_attempt_lockout_until TIMESTAMPTZ;

-- Update trigger function to use 90 minutes evidence window
CREATE OR REPLACE FUNCTION public.handle_dispute_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set 90-minute evidence window (accommodating Pakistani load-shedding)
  UPDATE public.lobbies
  SET 
    status = 'disputed',
    evidence_deadline = NOW() + INTERVAL '90 minutes',
    updated_at = NOW()
  WHERE id = NEW.lobby_id;

  NEW.evidence_deadline := NOW() + INTERVAL '90 minutes';
  RETURN NEW;
END;
$$;
