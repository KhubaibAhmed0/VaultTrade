"use client";

import { useState, useEffect, useCallback } from "react";
import { HandoverProtocol, OAuthService, isOAuthChecklistComplete, getRemainingOtpSeconds } from "@/lib/handover";
import {
  requestRiotEmailOtcAction,
  relayRiotEmailOtcAction,
  confirmOAuthUnlinkAction,
  checkOtcTimeoutAction,
  getHandoverProtocolAction,
} from "@/app/lobby/[id]/handover-actions";
import {
  ShieldAlert,
  Mail,
  KeyRound,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Unlink,
  Radio,
} from "lucide-react";

interface VaultRelayHandoverProps {
  lobbyId: string;
  role: "seller" | "buyer" | "visitor" | "admin";
  initialProtocol?: HandoverProtocol | null;
  currentRiotEmail?: string;
}

export function VaultRelayHandover({
  lobbyId,
  role,
  initialProtocol = null,
  currentRiotEmail,
}: VaultRelayHandoverProps) {
  const [protocol, setProtocol] = useState<HandoverProtocol | null>(initialProtocol);
  const [targetEmail, setTargetEmail] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  // Poll/fetch initial protocol if not provided
  const refreshProtocol = useCallback(async () => {
    try {
      const res = await getHandoverProtocolAction(lobbyId);
      if (res?.protocol) {
        setProtocol(res.protocol as HandoverProtocol);
      }
    } catch {
      // Handled silently
    }
  }, [lobbyId]);

  useEffect(() => {
    let mounted = true;
    if (!initialProtocol) {
      void getHandoverProtocolAction(lobbyId).then((res) => {
        if (mounted && res?.protocol) {
          setProtocol(res.protocol as HandoverProtocol);
        }
      }).catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [initialProtocol, lobbyId]);

  // 1-second interval timer for 15-minute countdown and timeout detection
  useEffect(() => {
    if (!protocol || protocol.status !== "pending") {
      return;
    }

    const interval = setInterval(async () => {
      const rem = getRemainingOtpSeconds(protocol.otp_expires_at);
      setRemainingSeconds(rem);

      if (rem === 0) {
        clearInterval(interval);
        try {
          const timeoutRes = await checkOtcTimeoutAction(lobbyId);
          if (timeoutRes.escalated) {
            void refreshProtocol();
          }
        } catch {
          // Handled
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [protocol, lobbyId, refreshProtocol]);

  // Buyer requests OTC
  const handleRequestOtc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmail.trim()) return;

    setErrorMsg(null);
    setLoading(true);
    try {
      await requestRiotEmailOtcAction(lobbyId, targetEmail);
      await refreshProtocol();
    } catch (err: unknown) {
      if (err instanceof Error) setErrorMsg(err.message);
      else setErrorMsg("Failed to request OTC.");
    } finally {
      setLoading(false);
    }
  };

  // Seller relays 6-digit OTC
  const handleRelayOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput.trim()) return;

    setErrorMsg(null);
    setLoading(true);
    try {
      await relayRiotEmailOtcAction(lobbyId, otpInput);
      setOtpInput("");
      await refreshProtocol();
    } catch (err: unknown) {
      if (err instanceof Error) setErrorMsg(err.message);
      else setErrorMsg("Failed to relay OTC.");
    } finally {
      setLoading(false);
    }
  };

  // Participant marks OAuth connection unlinked
  const handleUnlink = async (service: OAuthService) => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await confirmOAuthUnlinkAction(lobbyId, service);
      await refreshProtocol();
    } catch (err: unknown) {
      if (err instanceof Error) setErrorMsg(err.message);
      else setErrorMsg("Failed to update OAuth link.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyOtp = () => {
    if (!protocol?.riot_otp) return;
    navigator.clipboard.writeText(protocol.riot_otp);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const oauthServices: { key: OAuthService; label: string; desc: string }[] = [
    { key: "google", label: "Google Account", desc: "Unlink Google authentication from Riot Games account" },
    { key: "xbox", label: "Xbox Live / Game Pass", desc: "Disconnect Microsoft Xbox Live integration" },
    { key: "psn", label: "PlayStation Network (PSN)", desc: "Disconnect Sony PlayStation Network account link" },
    { key: "twitch", label: "Twitch Connections", desc: "Remove linked Twitch account for drop rewards" },
  ];

  const unlinkedCount = protocol
    ? [protocol.google_unlinked, protocol.xbox_unlinked, protocol.psn_unlinked, protocol.twitch_unlinked].filter(Boolean).length
    : 0;
  const isComplete = protocol ? isOAuthChecklistComplete(protocol) : false;

  return (
    <div className="card-surface p-5 space-y-5 border border-border-default">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-accent/10 border border-accent/30 flex items-center justify-center">
            <Radio className="w-4 h-4 text-accent" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary font-mono">
                VaultRelay Handover Gateway
              </h3>
              <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded bg-bg-inset border border-border-default text-text-muted">
                Sync Protocol v3
              </span>
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">
              Isolated typed channel for Riot Email OTC relay and 4-point OAuth unlinking.
            </p>
          </div>
        </div>

        {/* Live Status Badge */}
        {protocol?.status === "escalated_dispute" ? (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-danger-muted text-danger rounded border border-danger/30 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            15m Timeout Dispute
          </span>
        ) : protocol?.status === "unlinked" ? (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-success-muted text-success rounded border border-success/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Handover Fully Secured
          </span>
        ) : protocol?.status === "otp_relayed" ? (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-success-muted text-success rounded border border-success/30 flex items-center gap-1">
            <KeyRound className="w-3 h-3" />
            OTC Code Relayed
          </span>
        ) : protocol?.status === "pending" ? (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-warning-muted text-warning rounded border border-warning/30 flex items-center gap-1">
            <Clock className="w-3 h-3 animate-spin" />
            15m OTC Window Active
          </span>
        ) : (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-bg-inset text-text-muted rounded border border-border-default">
            Pending Request
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 rounded bg-danger-muted border border-danger/40 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <p className="text-xs text-danger">{errorMsg}</p>
        </div>
      )}

      {/* STEP 1: RIOT EMAIL OTC RELAY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-bg-elevated border border-border-default text-[10px] font-mono font-bold flex items-center justify-center text-text-secondary">
              1
            </span>
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wide">
              Riot Email Change OTC Gateway
            </h4>
          </div>

          {remainingSeconds !== null && (
            <div className="flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded bg-bg-inset border border-warning/40 text-warning">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatCountdown(remainingSeconds)}</span>
              <span className="text-[10px] text-text-muted">(auto-dispute on 0:00)</span>
            </div>
          )}
        </div>

        {/* Current Riot Email Reference */}
        {currentRiotEmail && (
          <div className="p-2.5 rounded bg-bg-inset border border-border-subtle flex items-center justify-between text-xs">
            <span className="text-text-muted">Current Account Email:</span>
            <span className="font-mono text-text-secondary">{currentRiotEmail}</span>
          </div>
        )}

        {/* No active protocol yet */}
        {!protocol && (
          <div className="p-4 rounded bg-bg-inset border border-border-default space-y-3">
            {role === "buyer" ? (
              <form onSubmit={handleRequestOtc} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Your Personal Email for Riot Account Transfer *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-text-muted absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. your_email@gmail.com"
                      value={targetEmail}
                      onChange={(e) => setTargetEmail(e.target.value)}
                      className="w-full h-10 input-inset pl-9 pr-3 text-sm font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-text-muted mt-1">
                    Submitting activates a strict 15-minute countdown. The seller must check their original inbox and relay the Riot OTP.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading || !targetEmail.trim()}
                  className="btn-primary h-9 px-4 text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  {loading ? "Initiating..." : "Request Riot Email Change OTC"}
                </button>
              </form>
            ) : (
              <div className="text-center py-4 space-y-1">
                <Mail className="w-6 h-6 text-text-muted mx-auto" />
                <p className="text-xs text-text-secondary font-medium">Waiting for Buyer to Specify Target Email</p>
                <p className="text-[11px] text-text-muted">
                  The buyer will enter their personal email to initiate the Riot Games verification code.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Protocol Active: Status Pending */}
        {protocol && protocol.status === "pending" && (
          <div className="space-y-3">
            <div className="p-3.5 rounded bg-bg-inset border border-warning/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Target Transfer Email:</span>
                <span className="font-mono font-semibold text-text-primary">{protocol.target_email}</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Riot Games sends a 6-digit confirmation code to the seller&apos;s current registered email. Under <strong>Invariant 6</strong>, the seller must relay it within 15 minutes to prevent stalling.
              </p>
            </div>

            {/* Seller Input Box */}
            {role === "seller" && (
              <form onSubmit={handleRelayOtp} className="p-4 rounded bg-bg-elevated border border-accent/40 space-y-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-accent" />
                  <span className="text-xs font-semibold text-text-primary">
                    Enter the 6-Digit Code from Riot Games
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                    className="h-10 w-44 input-inset px-3 text-center font-mono text-lg tracking-widest font-bold"
                  />
                  <button
                    type="submit"
                    disabled={loading || otpInput.trim().length !== 6}
                    className="btn-primary h-10 px-5 text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    {loading ? "Relaying..." : "Relay 6-Digit OTC"}
                  </button>
                </div>
                <p className="text-[11px] text-text-muted">
                  Bypasses chat filters safely. The buyer will receive this code instantly.
                </p>
              </form>
            )}

            {role === "buyer" && (
              <div className="p-3.5 rounded bg-bg-inset border border-border-default text-center space-y-1">
                <Clock className="w-5 h-5 text-warning mx-auto animate-spin" />
                <p className="text-xs text-text-primary font-semibold">Waiting for Seller to Relay 6-Digit OTC</p>
                <p className="text-[11px] text-text-muted">
                  If the seller does not provide the code before the 15-minute countdown reaches zero, the lobby auto-escalates to Disputed status to freeze your funds.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Protocol Active: OTC Relayed */}
        {protocol && (protocol.status === "otp_relayed" || protocol.status === "unlinked") && protocol.riot_otp && (
          <div className="p-4 rounded bg-bg-inset border border-success/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span className="text-xs font-semibold text-text-primary">
                  6-Digit OTC Code Relayed Successfully
                </span>
              </div>
              <span className="text-[10px] font-mono text-text-muted">
                Target: {protocol.target_email}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded bg-bg-elevated border border-border-default">
              <div>
                <span className="block text-[10px] text-text-muted uppercase tracking-wider mb-0.5">
                  Riot Verification Code (OTC)
                </span>
                <span className="font-mono text-2xl font-bold tracking-widest text-accent select-all">
                  {protocol.riot_otp}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyOtp}
                className="btn-secondary h-8 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {copiedOtp ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedOtp ? "Copied" : "Copy OTC"}</span>
              </button>
            </div>

            <div className="text-[11px] text-text-secondary flex items-start gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
              <span>
                Buyer: Visit <a href="https://account.riotgames.com" target="_blank" rel="noreferrer" className="text-accent underline font-mono">account.riotgames.com</a>, update email to <strong className="text-text-primary font-mono">{protocol.target_email}</strong>, and enter this 6-digit OTC to finalize.
              </span>
            </div>
          </div>
        )}

        {/* Escalated Dispute Banner */}
        {protocol?.status === "escalated_dispute" && (
          <div className="p-4 rounded bg-danger-muted border border-danger/40 space-y-2">
            <div className="flex items-center gap-2 text-danger font-semibold text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>15-Minute Handover Timeout Triggered</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              The seller failed to relay the 6-digit Riot OTC code within the mandatory 15-minute window. Escrow funds have been frozen under <strong>Invariant 6</strong>, and the 30-minute Evidence Clock is now active in the Dispute Panel.
            </p>
          </div>
        )}
      </div>

      {/* STEP 2: 4-POINT OAUTH UNLINKING CHECKLIST */}
      <div className="space-y-3 pt-3 border-t border-border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-bg-elevated border border-border-default text-[10px] font-mono font-bold flex items-center justify-center text-text-secondary">
              2
            </span>
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wide">
              4-Point 3rd-Party OAuth Unlinking
            </h4>
          </div>
          <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
            isComplete ? "bg-success-muted text-success border border-success/30" : "bg-bg-inset text-text-muted border border-border-default"
          }`}>
            {unlinkedCount} / 4 Unlinked
          </span>
        </div>

        <p className="text-[11px] text-text-muted">
          Ensure all external social and gaming logins are unlinked so the original owner cannot recover the Riot account via OAuth.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {oauthServices.map(({ key, label, desc }) => {
            const isUnlinked = protocol ? Boolean(protocol[`${key}_unlinked` as const]) : false;
            return (
              <div
                key={key}
                className={`p-3 rounded border flex items-start justify-between gap-2.5 transition-colors ${
                  isUnlinked
                    ? "bg-bg-inset border-success/30 text-text-primary"
                    : "bg-bg-inset border-border-default text-text-secondary"
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    {isUnlinked ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                    ) : (
                      <Unlink className="w-3.5 h-3.5 text-text-muted shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-text-primary">{label}</span>
                  </div>
                  <p className="text-[10px] text-text-muted leading-tight">{desc}</p>
                </div>

                {!isUnlinked && (role === "seller" || role === "buyer") && protocol && (
                  <button
                    type="button"
                    onClick={() => handleUnlink(key)}
                    disabled={loading}
                    className="btn-secondary h-6 px-2 text-[10px] font-medium shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    Confirm Unlink
                  </button>
                )}

                {isUnlinked && (
                  <span className="text-[10px] font-mono text-success font-semibold shrink-0">
                    Unlinked
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
