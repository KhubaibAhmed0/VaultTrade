-- Migration 002: Row Level Security (RLS) Policies for VaultTrade

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Public profiles are readable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 2. Lobbies Policies
CREATE POLICY "Users can view open lobbies or lobbies they participate in or admins"
ON public.lobbies FOR SELECT
TO authenticated
USING (
  status = 'open' 
  OR auth.uid() = seller_id 
  OR auth.uid() = buyer_id 
  OR public.is_admin()
);

CREATE POLICY "Sellers can create lobbies"
ON public.lobbies FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = seller_id);

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

-- 3. Credentials Policies (Security Invariant 1)
-- Seller can insert credentials once
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

-- ONLY buyer can read credentials (Seller and Admin CANNOT SELECT)
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

-- 4. Transactions Policies
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

CREATE POLICY "Only admin can update transaction verification"
ON public.transactions FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 5. Disputes Policies
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

CREATE POLICY "Only admin can update disputes"
ON public.disputes FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 6. Lobby Messages Policies
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

-- 7. Push Subscriptions Policies
CREATE POLICY "Users can view their own push subscriptions"
ON public.push_subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can insert their own push subscriptions"
ON public.push_subscriptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
ON public.push_subscriptions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
