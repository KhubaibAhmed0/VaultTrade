-- Migration 005: Pre-Escrow Riot Shard & Asset Lock
-- Adds immutable PUUID, normalized Riot ID, AP shard compatibility, rank/level snapshot, and RFC 8785 snapshot hash to lobbies.

ALTER TABLE public.lobbies
  ADD COLUMN IF NOT EXISTS puuid TEXT,
  ADD COLUMN IF NOT EXISTS riot_id_normalized TEXT,
  ADD COLUMN IF NOT EXISTS account_region TEXT DEFAULT 'ap',
  ADD COLUMN IF NOT EXISTS is_ap_shard BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS account_rank TEXT,
  ADD COLUMN IF NOT EXISTS account_level INTEGER,
  ADD COLUMN IF NOT EXISTS snapshot_hash TEXT;

-- Guard against the 30-day Riot ID rename exploit:
-- Ensure no two concurrent active lobbies can exist for the same immutable Riot PUUID.
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_puuid 
ON public.lobbies (puuid) 
WHERE puuid IS NOT NULL AND status NOT IN ('completed', 'refunded', 'cancelled');

-- Index on normalized Riot ID for fast lookups
CREATE INDEX IF NOT EXISTS idx_lobbies_riot_id_normalized 
ON public.lobbies (riot_id_normalized);
