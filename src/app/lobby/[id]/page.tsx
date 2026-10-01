import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { LobbyView } from "./LobbyView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LobbyPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch lobby details with seller & buyer profiles
  const { data: lobby, error } = await supabase
    .from("lobbies")
    .select(`
      *,
      seller:profiles!seller_id(id, display_name, facebook_url, completed_deals),
      buyer:profiles!buyer_id(id, display_name, facebook_url, completed_deals)
    `)
    .eq("id", id)
    .single();

  if (error || !lobby) {
    notFound();
  }

  // Fetch current user's profile to check admin status
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.is_admin || false;
  const isSeller = lobby.seller_id === user.id;
  const isBuyer = lobby.buyer_id === user.id;

  // Determine user's role in this lobby
  let role: "seller" | "buyer" | "visitor" | "admin" = "visitor";
  if (isAdmin) role = "admin";
  else if (isSeller) role = "seller";
  else if (isBuyer) role = "buyer";

  // If lobby is not open and user is not a participant or admin, restrict access
  if (lobby.status !== "open" && role === "visitor") {
    redirect("/dashboard");
  }

  // Invariant 1: Fetch credentials ONLY if current user is the buyer (Admin & Seller never see raw creds)
  let credentials = null;
  if (isBuyer) {
    const { data: creds } = await supabase
      .from("credentials")
      .select("riot_email, riot_password, first_email, date_of_birth, social_logins, notes")
      .eq("lobby_id", id)
      .maybeSingle();

    credentials = creds;
  }

  const platformIban =
    process.env.PLATFORM_SADAPAY_IBAN || "PK00SADA0000001234567890";

  interface RawLobbyParty {
    id: string;
    display_name: string;
    facebook_url: string;
    completed_deals: number;
  }

  const rawSeller = Array.isArray(lobby.seller) ? lobby.seller[0] : (lobby.seller as unknown as RawLobbyParty);
  const rawBuyer = Array.isArray(lobby.buyer) ? lobby.buyer[0] : (lobby.buyer as unknown as RawLobbyParty | null);

  const formattedLobby = {
    ...lobby,
    seller: rawSeller || { id: lobby.seller_id, display_name: "Seller", facebook_url: "", completed_deals: 0 },
    buyer: rawBuyer || null,
  };

  return (
    <LobbyView
      lobby={formattedLobby}
      credentials={credentials}
      currentUserId={user.id}
      role={role}
      platformIban={platformIban}
    />
  );
}
