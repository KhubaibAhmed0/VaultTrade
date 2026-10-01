import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  // Authorization check for automated cron execution
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production" && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
    }
  }

  try {
    const admin = createAdminClient();
    const now = new Date().toISOString();

    // 1. Execute database stored procedure for atomic auto-release if available
    let releasedCount = 0;
    try {
      const { data: rpcCount, error: rpcErr } = await admin.rpc("auto_release_expired_lobbies");
      if (!rpcErr && typeof rpcCount === "number") {
        releasedCount = rpcCount;
      }
    } catch {
      // Fallback: Atomic query update with status guard
      const payoutAt = new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString();
      const { data: updated } = await admin
        .from("lobbies")
        .update({
          status: "completed",
          completed_at: now,
          payout_at: payoutAt,
        })
        .eq("status", "inspecting") // Atomic guard: only update if still inspecting
        .lt("auto_release_at", now)
        .select("id");

      releasedCount = updated?.length || 0;
    }

    return NextResponse.json({
      success: true,
      releasedLobbies: releasedCount,
      timestamp: now,
    });
  } catch (err: unknown) {
    console.error("Cron auto-release failure:", err);
    return NextResponse.json({ error: "Failed executing auto-release cron" }, { status: 500 });
  }
}
