import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardView } from "./DashboardView";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/setup");
  }

  // Fetch lobbies where user is seller or buyer
  const { data: lobbies } = await supabase
    .from("lobbies")
    .select("*")
    .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  return <DashboardView profile={profile} lobbies={lobbies || []} />;
}
