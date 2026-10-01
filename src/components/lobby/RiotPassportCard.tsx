"use client";

import { useState } from "react";
import { Shield, ShieldAlert, CheckCircle2, Copy, Check, Hash, Award, Globe, Lock } from "lucide-react";

export interface RiotPassportCardProps {
  puuid: string;
  riotId: string;
  accountRegion: string;
  isApShard: boolean;
  accountRank?: string | null;
  accountLevel?: number | null;
  snapshotHash?: string | null;
  compact?: boolean;
  className?: string;
}

export function RiotPassportCard({
  puuid,
  riotId,
  accountRegion,
  isApShard,
  accountRank = "Unranked",
  accountLevel = 1,
  snapshotHash,
  compact = false,
  className = "",
}: RiotPassportCardProps) {
  const [copiedPuuid, setCopiedPuuid] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  const handleCopyPuuid = () => {
    navigator.clipboard.writeText(puuid);
    setCopiedPuuid(true);
    setTimeout(() => setCopiedPuuid(false), 2000);
  };

  const handleCopyHash = () => {
    if (!snapshotHash) return;
    navigator.clipboard.writeText(snapshotHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div
      className={`rounded-lg border bg-bg-surface ${
        isApShard ? "border-border-default" : "border-warning/50"
      } ${compact ? "p-3.5" : "p-5"} space-y-4 ${className}`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${
              isApShard
                ? "bg-accent-muted text-accent"
                : "bg-warning-muted/40 text-warning"
            }`}
          >
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-text-muted block">
              Immutable Asset Passport
            </span>
            <span className="text-sm font-bold font-mono text-text-primary">
              {riotId}
            </span>
          </div>
        </div>

        {/* Shard Badge */}
        {isApShard ? (
          <div className="px-2.5 py-1 rounded bg-success-muted/30 border border-success/40 text-success text-[11px] font-semibold flex items-center gap-1.5 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>AP SHARD (MUMBAI/BAHRAIN)</span>
          </div>
        ) : (
          <div className="px-2.5 py-1 rounded bg-warning-muted/40 border border-warning/50 text-warning text-[11px] font-semibold flex items-center gap-1.5 shrink-0">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>NON-AP SHARD ({accountRegion.toUpperCase()})</span>
          </div>
        )}
      </div>

      {/* Non-AP Shard Critical Warning */}
      {!isApShard && (
        <div className="p-3 rounded-md bg-warning-muted/20 border border-warning/30 text-xs text-warning leading-relaxed flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-semibold">High Latency Warning for Pakistan</strong>
            This account is registered to <strong>{accountRegion.toUpperCase()}</strong> shard. Pakistani gamers face 150-250ms+ ping and cannot queue on Mumbai servers without an approved Riot region transfer.
          </div>
        </div>
      )}

      {/* Account Attributes Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
        <div className="p-2.5 rounded bg-bg-inset border border-border-subtle">
          <span className="text-[10px] text-text-muted flex items-center gap-1 mb-1">
            <Award className="w-3 h-3 text-accent" />
            Competitive Rank
          </span>
          <span className="text-xs font-mono font-semibold text-text-primary block truncate">
            {accountRank || "Unranked"}
          </span>
        </div>

        <div className="p-2.5 rounded bg-bg-inset border border-border-subtle">
          <span className="text-[10px] text-text-muted flex items-center gap-1 mb-1">
            <Hash className="w-3 h-3 text-accent" />
            Account Level
          </span>
          <span className="text-xs font-mono font-semibold text-text-primary block">
            Lvl {accountLevel ?? "N/A"}
          </span>
        </div>

        <div className="p-2.5 rounded bg-bg-inset border border-border-subtle col-span-2 sm:col-span-1">
          <span className="text-[10px] text-text-muted flex items-center gap-1 mb-1">
            <Globe className="w-3 h-3 text-accent" />
            Server Shard
          </span>
          <span className="text-xs font-mono font-semibold text-text-primary block uppercase">
            {accountRegion} {isApShard ? "(Low Ping)" : "(High Ping)"}
          </span>
        </div>
      </div>

      {/* PUUID & Cryptographic Snapshot */}
      <div className="space-y-2 pt-1 border-t border-border-subtle text-xs">
        {/* PUUID */}
        <div className="flex items-center justify-between p-2 rounded bg-bg-inset border border-border-subtle">
          <div className="flex items-center gap-1.5 truncate mr-2">
            <Lock className="w-3 h-3 text-text-muted shrink-0" />
            <span className="text-[11px] text-text-muted shrink-0">PUUID:</span>
            <span className="font-mono text-[11px] text-text-primary truncate" title={puuid}>
              {puuid}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopyPuuid}
            className="text-[10px] font-mono text-text-secondary hover:text-text-primary flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-bg-elevated transition-colors shrink-0"
          >
            {copiedPuuid ? (
              <>
                <Check className="w-3 h-3 text-success" />
                <span className="text-success">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Snapshot Hash */}
        {snapshotHash && (
          <div className="flex items-center justify-between p-2 rounded bg-bg-inset border border-border-subtle">
            <div className="flex items-center gap-1.5 truncate mr-2">
              <span className="text-[10px] font-mono text-accent shrink-0">RFC 8785:</span>
              <span
                className="font-mono text-[11px] text-text-muted truncate"
                title={snapshotHash}
              >
                {snapshotHash.slice(0, 16)}...{snapshotHash.slice(-16)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyHash}
              className="text-[10px] font-mono text-text-secondary hover:text-text-primary flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-bg-elevated transition-colors shrink-0"
            >
              {copiedHash ? (
                <>
                  <Check className="w-3 h-3 text-success" />
                  <span className="text-success">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Hash</span>
                </>
              )}
            </button>
          </div>
        )}

        <p className="text-[10px] text-text-muted leading-relaxed">
          Locked to immutable PUUID. Prevents 30-day Riot ID rename exploits and rank tampering.
        </p>
      </div>
    </div>
  );
}
