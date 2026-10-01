-- Migration 003: Helper Functions & Triggers for VaultTrade

-- 1. Platform Fee Calculator
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

-- Trigger to auto-set platform_fee if not provided or to enforce calculation
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

-- 2. Increment completed_deals for both parties upon deal completion
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

-- 3. Auto-release function (to be called by cron or edge function worker)
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
