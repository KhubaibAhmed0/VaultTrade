import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminDashboardView } from "./AdminDashboardView";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check admin status
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/dashboard");
  }

  // 1. Pending unverified transactions
  const { data: pendingTxs } = await supabase
    .from("transactions")
    .select(`
      id,
      lobby_id,
      buyer_raast_trn,
      buyer_screenshot_url,
      amount,
      created_at,
      lobby:lobbies!lobby_id(
        riot_id,
        buyer:profiles!buyer_id(display_name, phone)
      )
    `)
    .eq("admin_verified", false)
    .order("created_at", { ascending: false });

  // 2. Active disputes
  const { data: disputes } = await supabase
    .from("disputes")
    .select(`
      id,
      lobby_id,
      reason,
      evidence_urls,
      created_at,
      lobby:lobbies!lobby_id(
        riot_id,
        seller:profiles!seller_id(display_name),
        buyer:profiles!buyer_id(display_name)
      )
    `)
    .eq("resolution", "pending")
    .order("created_at", { ascending: false });

  // 3. Completed deals pending seller payout
  const { data: payouts } = await supabase
    .from("lobbies")
    .select(`
      id,
      riot_id,
      amount,
      payout_at,
      seller:profiles!seller_id(display_name, phone)
    `)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  // Normalize joined relation fields
  interface RawTx {
    id: string;
    lobby_id: string;
    buyer_raast_trn: string;
    buyer_screenshot_url: string | null;
    amount: number;
    created_at: string;
    lobby: {
      riot_id: string;
      buyer: { display_name: string; phone: string } | { display_name: string; phone: string }[] | null;
    } | {
      riot_id: string;
      buyer: { display_name: string; phone: string } | { display_name: string; phone: string }[] | null;
    }[];
  }

  interface RawDispute {
    id: string;
    lobby_id: string;
    reason: string;
    evidence_urls: string[];
    created_at: string;
    lobby: {
      riot_id: string;
      seller: { display_name: string } | { display_name: string }[];
      buyer: { display_name: string } | { display_name: string }[] | null;
    } | {
      riot_id: string;
      seller: { display_name: string } | { display_name: string }[];
      buyer: { display_name: string } | { display_name: string }[] | null;
    }[];
  }

  interface RawPayout {
    id: string;
    riot_id: string;
    amount: number;
    payout_at: string | null;
    seller: { display_name: string; phone: string } | { display_name: string; phone: string }[];
  }

  const formattedTxs = ((pendingTxs || []) as unknown as RawTx[]).map((tx) => {
    const rawLobby = Array.isArray(tx.lobby) ? tx.lobby[0] : tx.lobby;
    const rawBuyer = rawLobby?.buyer;
    const buyer = Array.isArray(rawBuyer) ? rawBuyer[0] : rawBuyer;

    return {
      id: tx.id,
      lobby_id: tx.lobby_id,
      buyer_raast_trn: tx.buyer_raast_trn,
      buyer_screenshot_url: tx.buyer_screenshot_url,
      amount: tx.amount,
      created_at: tx.created_at,
      lobby: {
        riot_id: rawLobby?.riot_id || "Unknown",
        buyer: buyer || null,
      },
    };
  });

  const formattedDisputes = ((disputes || []) as unknown as RawDispute[]).map((d) => {
    const rawLobby = Array.isArray(d.lobby) ? d.lobby[0] : d.lobby;
    const rawSeller = rawLobby?.seller;
    const seller = Array.isArray(rawSeller) ? rawSeller[0] : rawSeller;
    const rawBuyer = rawLobby?.buyer;
    const buyer = Array.isArray(rawBuyer) ? rawBuyer[0] : rawBuyer;

    return {
      id: d.id,
      lobby_id: d.lobby_id,
      reason: d.reason,
      evidence_urls: d.evidence_urls || [],
      created_at: d.created_at,
      lobby: {
        riot_id: rawLobby?.riot_id || "Unknown",
        seller: seller || { display_name: "Seller" },
        buyer: buyer || null,
      },
    };
  });

  const formattedPayouts = ((payouts || []) as unknown as RawPayout[]).map((p) => {
    const seller = Array.isArray(p.seller) ? p.seller[0] : p.seller;
    return {
      id: p.id,
      riot_id: p.riot_id,
      amount: p.amount,
      payout_at: p.payout_at,
      seller: seller || { display_name: "Seller", phone: "" },
    };
  });

  return (
    <AdminDashboardView
      pendingTransactions={formattedTxs}
      disputes={formattedDisputes}
      pendingPayouts={formattedPayouts}
    />
  );
}
