"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, Plus, ArrowRight, CheckCircle2, Lock, ExternalLink } from "lucide-react";

interface LobbyItem {
  id: string;
  riot_id: string;
  amount: number;
  platform_fee: number;
  status: string;
  seller_id: string;
  buyer_id?: string | null;
  created_at: string;
}

interface DashboardViewProps {
  profile: {
    id: string;
    display_name: string;
    phone: string;
    facebook_url: string;
    completed_deals: number;
    is_admin: boolean;
  };
  lobbies: LobbyItem[];
}

export function DashboardView({ profile, lobbies }: DashboardViewProps) {
  const [tab, setTab] = useState<"active" | "history">("active");

  const activeStatuses = ["open", "awaiting_payment", "awaiting_credentials", "inspecting", "disputed"];
  const historyStatuses = ["completed", "refunded", "cancelled"];

  const activeLobbies = lobbies.filter((l) => activeStatuses.includes(l.status));
  const historyLobbies = lobbies.filter((l) => historyStatuses.includes(l.status));

  const displayList = tab === "active" ? activeLobbies : historyLobbies;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Profile Bar */}
      <div className="card-surface p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-bg-surface border border-border-default flex items-center justify-center">
            <Shield className="w-6 h-6 text-accent" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-text-primary">
                {profile.display_name}
              </h2>
              {profile.is_admin && (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-danger-muted text-danger rounded border border-danger/30">
                  Admin
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
              <span>{profile.completed_deals} completed deals</span>
              <span>•</span>
              <a
                href={profile.facebook_url}
                target="_blank"
                rel="noreferrer"
                className="text-text-secondary hover:text-accent flex items-center gap-1"
              >
                <span>Facebook Profile</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {profile.is_admin && (
            <Link
              href="/admin"
              className="btn-secondary h-9 px-4 text-xs flex items-center gap-1.5"
            >
              Admin Dashboard
            </Link>
          )}
          <Link
            href="/lobby/create"
            className="btn-primary h-9 px-4 text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Lobby</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border-subtle pb-2">
        <button
          type="button"
          onClick={() => setTab("active")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            tab === "active"
              ? "bg-bg-elevated text-text-primary"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          Active Lobbies ({activeLobbies.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("history")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            tab === "history"
              ? "bg-bg-elevated text-text-primary"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          Deal History ({historyLobbies.length})
        </button>
      </div>

      {/* Lobbies List */}
      <div className="space-y-3">
        {displayList.length === 0 ? (
          <div className="card-surface p-12 text-center space-y-3">
            <Lock className="w-8 h-8 text-text-muted mx-auto" />
            <h3 className="text-sm font-semibold text-text-primary">
              {tab === "active" ? "No Active Deal Lobbies" : "No Past Deals Yet"}
            </h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              {tab === "active"
                ? "Create a deal lobby to sell an account, or ask your seller for their VaultTrade lobby link."
                : "Your completed, refunded, and cancelled deals will appear here."}
            </p>
            {tab === "active" && (
              <div className="pt-2">
                <Link
                  href="/lobby/create"
                  className="btn-primary inline-flex h-9 px-4 text-xs items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create First Lobby
                </Link>
              </div>
            )}
          </div>
        ) : (
          displayList.map((lobby) => {
            const isSeller = lobby.seller_id === profile.id;
            return (
              <div
                key={lobby.id}
                className="card-surface p-4 flex flex-wrap items-center justify-between gap-4 hover:border-border-default transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-text-primary">
                      {lobby.riot_id}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-medium rounded ${
                        isSeller
                          ? "bg-accent-muted text-accent border border-accent/20"
                          : "bg-bg-elevated text-text-secondary border border-border-default"
                      }`}
                    >
                      {isSeller ? "Seller" : "Buyer"}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted flex items-center gap-2">
                    <span>Valuation: {lobby.amount.toLocaleString()} PKR</span>
                    <span>•</span>
                    <span className="capitalize">{lobby.status.replace("_", " ")}</span>
                  </div>
                </div>

                <Link
                  href={`/lobby/${lobby.id}`}
                  className="btn-secondary h-8 px-3 text-xs flex items-center gap-1.5"
                >
                  <span>Open Lobby</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
