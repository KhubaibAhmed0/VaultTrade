"use client";

import { useState } from "react";
import { adminVerifyPaymentAction } from "@/app/lobby/[id]/actions";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

interface PendingTx {
  id: string;
  lobby_id: string;
  buyer_raast_trn: string;
  buyer_screenshot_url?: string | null;
  amount: number;
  created_at: string;
  lobby: {
    riot_id: string;
    buyer: {
      display_name: string;
      phone: string;
    } | null;
  };
}

interface ActiveDispute {
  id: string;
  lobby_id: string;
  reason: string;
  evidence_urls: string[];
  created_at: string;
  lobby: {
    riot_id: string;
    seller: { display_name: string };
    buyer: { display_name: string } | null;
  };
}

interface PendingPayout {
  id: string;
  riot_id: string;
  amount: number;
  seller: {
    display_name: string;
    phone: string;
  };
  payout_at?: string | null;
}

interface AdminDashboardViewProps {
  pendingTransactions: PendingTx[];
  disputes: ActiveDispute[];
  pendingPayouts: PendingPayout[];
}

export function AdminDashboardView({
  pendingTransactions,
  disputes,
  pendingPayouts,
}: AdminDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<"payments" | "disputes" | "payouts">("payments");
  const [loadingTxId, setLoadingTxId] = useState<string | null>(null);

  const handleVerify = async (lobbyId: string, approved: boolean) => {
    setLoadingTxId(lobbyId);
    try {
      await adminVerifyPaymentAction(lobbyId, approved);
    } catch (err) {
      console.error("Verification failed:", err);
    } finally {
      setLoadingTxId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Admin Header */}
      <div className="card-surface p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-text-primary">Admin Control Center</h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-danger-muted text-danger rounded border border-danger/30">
              Admin Privilege
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Review incoming Raast payments, resolve escalated disputes, and manage seller payouts.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="btn-secondary h-8 px-3 text-xs flex items-center gap-1.5"
        >
          ← User Dashboard
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border-subtle pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("payments")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            activeTab === "payments"
              ? "bg-bg-elevated text-text-primary"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          Pending Payments ({pendingTransactions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("disputes")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            activeTab === "disputes"
              ? "bg-bg-elevated text-text-primary"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          Active Disputes ({disputes.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("payouts")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            activeTab === "payouts"
              ? "bg-bg-elevated text-text-primary"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          Pending Payouts ({pendingPayouts.length})
        </button>
      </div>

      {/* TAB 1: PENDING PAYMENTS */}
      {activeTab === "payments" && (
        <div className="space-y-3">
          {pendingTransactions.length === 0 ? (
            <div className="card-surface p-12 text-center text-xs text-text-muted">
              No payments waiting for verification. All clear!
            </div>
          ) : (
            pendingTransactions.map((tx) => (
              <div
                key={tx.id}
                className="card-surface p-5 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-text-primary">
                      {tx.lobby.riot_id}
                    </span>
                    <span className="font-mono text-xs text-accent font-semibold">
                      {tx.amount.toLocaleString()} PKR
                    </span>
                  </div>
                  <div className="text-xs text-text-secondary space-y-0.5">
                    <div>
                      Buyer: <strong>{tx.lobby.buyer?.display_name || "Unknown"}</strong> (
                      {tx.lobby.buyer?.phone})
                    </div>
                    <div>
                      Raast TRN:{" "}
                      <span className="font-mono text-text-primary select-all">
                        {tx.buyer_raast_trn}
                      </span>
                    </div>
                    {tx.buyer_screenshot_url && (
                      <a
                        href={tx.buyer_screenshot_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent hover:underline flex items-center gap-1 text-[11px] pt-0.5"
                      >
                        <span>View Payment Screenshot</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={loadingTxId === tx.lobby_id}
                    onClick={() => handleVerify(tx.lobby_id, false)}
                    className="btn-secondary h-8 px-3 text-xs text-danger flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                  <button
                    type="button"
                    disabled={loadingTxId === tx.lobby_id}
                    onClick={() => handleVerify(tx.lobby_id, true)}
                    className="btn-primary h-8 px-4 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Received</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: ACTIVE DISPUTES */}
      {activeTab === "disputes" && (
        <div className="space-y-3">
          {disputes.length === 0 ? (
            <div className="card-surface p-12 text-center text-xs text-text-muted">
              Zero active disputes. All transactions running smoothly.
            </div>
          ) : (
            disputes.map((dispute) => (
              <div key={dispute.id} className="card-surface p-5 space-y-3 border-danger/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-danger" />
                    <span className="font-mono text-sm font-bold text-text-primary">
                      {dispute.lobby.riot_id}
                    </span>
                  </div>
                  <Link
                    href={`/lobby/${dispute.lobby_id}`}
                    className="btn-secondary h-7 px-3 text-xs"
                  >
                    Inspect Deal Room →
                  </Link>
                </div>
                <p className="text-xs text-text-secondary bg-bg-inset p-3 rounded-md">
                  <strong>Reason:</strong> {dispute.reason}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: PENDING PAYOUTS */}
      {activeTab === "payouts" && (
        <div className="space-y-3">
          {pendingPayouts.length === 0 ? (
            <div className="card-surface p-12 text-center text-xs text-text-muted">
              No seller payouts currently due.
            </div>
          ) : (
            pendingPayouts.map((payout) => (
              <div
                key={payout.id}
                className="card-surface p-5 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <span className="font-mono text-sm font-bold text-text-primary">
                    {payout.riot_id}
                  </span>
                  <div className="text-xs text-text-secondary mt-1">
                    Disburse: <strong className="text-accent">{payout.amount.toLocaleString()} PKR</strong> to{" "}
                    <strong>{payout.seller.display_name}</strong> ({payout.seller.phone})
                  </div>
                </div>

                <Link
                  href={`/lobby/${payout.id}`}
                  className="btn-secondary h-8 px-3 text-xs flex items-center gap-1.5"
                >
                  <span>Review Deal</span>
                </Link>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
