"use client";

import { useEffect, useState } from "react";
import { LobbyStatus } from "@/lib/state-machine";
import { Clock, Lock } from "lucide-react";

interface LobbyStatusBarProps {
  status: LobbyStatus;
  autoReleaseAt?: string | null;
  evidenceDeadline?: string | null;
  payoutAt?: string | null;
}

export function LobbyStatusBar({
  status,
  autoReleaseAt,
  evidenceDeadline,
  payoutAt,
}: LobbyStatusBarProps) {
  const targetDateStr =
    status === "inspecting"
      ? autoReleaseAt
      : status === "disputed"
      ? evidenceDeadline
      : status === "completed"
      ? payoutAt
      : null;

  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (!targetDateStr) {
      return;
    }

    const calculateTime = () => {
      const targetTime = new Date(targetDateStr).getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft("00:00:00");
        setIsUrgent(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setIsUrgent(diff < 60 * 60 * 1000); // Less than 1 hour is urgent

      const pad = (n: number) => n.toString().padStart(2, "0");
      setTimeLeft(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDateStr]);

  const getStatusBadge = () => {
    switch (status) {
      case "open":
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-sm bg-accent-muted text-accent border border-accent/20">
            Open for Buyer
          </span>
        );
      case "awaiting_payment":
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-sm bg-warning-muted text-warning border border-warning/20">
            Awaiting Raast Payment
          </span>
        );
      case "awaiting_credentials":
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-sm bg-warning-muted text-warning border border-warning/20">
            Payment Locked — Awaiting Credentials
          </span>
        );
      case "inspecting":
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-sm bg-accent-muted text-accent border border-accent/20">
            Account Under Inspection
          </span>
        );
      case "completed":
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-sm bg-success-muted text-success border border-success/20">
            Deal Completed
          </span>
        );
      case "disputed":
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-sm bg-danger-muted text-danger border border-danger/20">
            Dispute Active
          </span>
        );
      case "refunded":
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-sm bg-danger-muted text-danger border border-danger/20">
            Refunded to Buyer
          </span>
        );
      case "cancelled":
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-sm bg-bg-elevated text-text-muted border border-border-default">
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="card-surface p-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-text-muted" />
        <span className="text-xs font-medium text-text-secondary">Lobby Status:</span>
        {getStatusBadge()}
      </div>

      {timeLeft && (
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${isUrgent ? "text-danger" : "text-warning"}`} />
          <span className="text-xs text-text-muted">
            {status === "inspecting"
              ? "Auto-Release in:"
              : status === "disputed"
              ? "Evidence Deadline:"
              : "Payout Hold Remaining:"}
          </span>
          <span
            className={`font-mono text-sm font-semibold tracking-wider ${
              isUrgent ? "text-danger" : "text-warning"
            }`}
          >
            {timeLeft}
          </span>
        </div>
      )}
    </div>
  );
}
