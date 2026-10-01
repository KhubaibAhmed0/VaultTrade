"use client";

import { useState } from "react";
import { LobbyStatus } from "@/lib/state-machine";
import { LobbyStatusBar } from "@/components/lobby/LobbyStatusBar";
import { CredentialForm } from "@/components/lobby/CredentialForm";
import { CredentialViewer } from "@/components/lobby/CredentialViewer";
import { VerificationChecklist } from "@/components/lobby/VerificationChecklist";
import { ReleaseCodeInput } from "@/components/lobby/ReleaseCodeInput";
import { DisputePanel } from "@/components/lobby/DisputePanel";
import { LobbyChat } from "@/components/lobby/LobbyChat";
import { joinLobbyAction, submitPaymentProofAction } from "./actions";
import {
  Shield,
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
  Upload,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface LobbyViewProps {
  lobby: {
    id: string;
    riot_id: string;
    amount: number;
    platform_fee: number;
    status: string;
    auto_release_at?: string | null;
    evidence_deadline?: string | null;
    payout_at?: string | null;
    seller: {
      id: string;
      display_name: string;
      facebook_url: string;
      completed_deals: number;
    };
    buyer?: {
      id: string;
      display_name: string;
      facebook_url: string;
      completed_deals: number;
    } | null;
  };
  credentials?: {
    riot_email: string;
    riot_password: string;
    first_email: string;
    date_of_birth: string;
    social_logins?: string | null;
    notes?: string | null;
  } | null;
  currentUserId: string;
  role: "seller" | "buyer" | "visitor" | "admin";
  platformIban: string;
}

export function LobbyView({
  lobby,
  credentials,
  currentUserId,
  role,
  platformIban,
}: LobbyViewProps) {
  const [copiedIban, setCopiedIban] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [joining, setJoining] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [raastTrn, setRaastTrn] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [checklistComplete, setChecklistComplete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalAmount = lobby.amount + lobby.platform_fee;
  const status = lobby.status as LobbyStatus;

  const handleCopyIban = () => {
    navigator.clipboard.writeText(platformIban);
    setCopiedIban(true);
    setTimeout(() => setCopiedIban(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleJoinLobby = async () => {
    setErrorMsg(null);
    setJoining(true);
    try {
      await joinLobbyAction(lobby.id);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to join lobby.");
      }
    } finally {
      setJoining(false);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!raastTrn.trim()) return;

    setErrorMsg(null);
    setSubmittingPayment(true);
    try {
      await submitPaymentProofAction(lobby.id, raastTrn, screenshotUrl);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to submit payment.");
      }
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Top Status & Timer Bar */}
      <LobbyStatusBar
        status={status}
        autoReleaseAt={lobby.auto_release_at}
        evidenceDeadline={lobby.evidence_deadline}
        payoutAt={lobby.payout_at}
      />

      {errorMsg && (
        <div className="p-3.5 rounded-md bg-danger-muted border border-danger/40 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <p className="text-xs text-danger leading-relaxed">{errorMsg}</p>
        </div>
      )}

      {/* Main Grid: Left Protocol Action Area (60%) vs Right Chat Stream (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Deal State & Actions */}
        <div className="lg:col-span-7 space-y-5">
          {/* Header Card */}
          <div className="card-surface p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <span className="block text-[11px] font-semibold text-accent uppercase tracking-wider mb-1">
                  Valorant Riot ID
                </span>
                <h1 className="text-xl font-bold font-mono text-text-primary">
                  {lobby.riot_id}
                </h1>
              </div>

              <div className="text-right">
                <span className="block text-[11px] font-medium text-text-muted mb-0.5">
                  Escrow Valuation
                </span>
                <span className="text-lg font-bold font-mono text-accent">
                  {lobby.amount.toLocaleString()} PKR
                </span>
                <span className="block text-[10px] text-text-muted">
                  +{lobby.platform_fee} PKR fee
                </span>
              </div>
            </div>

            {/* Counterparties */}
            <div className="pt-4 border-t border-border-subtle grid grid-cols-2 gap-4">
              <div>
                <span className="block text-[11px] text-text-muted mb-1">Seller</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-text-primary">
                    {lobby.seller.display_name}
                  </span>
                  <a
                    href={lobby.seller.facebook_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-text-muted hover:text-accent"
                    title="Facebook Profile"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <span className="text-[10px] text-text-muted">
                  {lobby.seller.completed_deals} deals completed
                </span>
              </div>

              <div>
                <span className="block text-[11px] text-text-muted mb-1">Buyer</span>
                {lobby.buyer ? (
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-text-primary">
                        {lobby.buyer.display_name}
                      </span>
                      <a
                        href={lobby.buyer.facebook_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-text-muted hover:text-accent"
                        title="Facebook Profile"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <span className="text-[10px] text-text-muted">
                      {lobby.buyer.completed_deals} deals completed
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-text-muted italic">
                    Waiting for buyer to join...
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* STATE 1: OPEN */}
          {status === "open" && (
            <div className="card-surface p-6 space-y-4">
              {role === "seller" ? (
                <>
                  <h3 className="text-sm font-semibold text-text-primary">
                    Share Link With Buyer
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    This deal lobby is active. Send this link to your buyer in the Facebook group or messenger.
                  </p>
                  <div className="p-3 rounded-md bg-bg-inset border border-border-default flex items-center justify-between">
                    <span className="font-mono text-xs text-text-muted truncate mr-2">
                      {typeof window !== "undefined" ? window.location.href : ""}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="btn-secondary h-8 px-3 text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? "Copied" : "Copy Link"}</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-semibold text-text-primary">
                    Accept Deal & Lock Escrow
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    You are joining as the Buyer for <strong className="text-text-primary">{lobby.riot_id}</strong>. Total payment required is{" "}
                    <strong className="text-accent">{totalAmount.toLocaleString()} PKR</strong> (includes {lobby.platform_fee} PKR platform protection fee).
                  </p>
                  <button
                    type="button"
                    onClick={handleJoinLobby}
                    disabled={joining}
                    className="w-full btn-primary h-10 text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {joining ? "Joining..." : "Join as Buyer"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          )}

          {/* STATE 2: AWAITING PAYMENT */}
          {status === "awaiting_payment" && (
            <div className="card-surface p-6 space-y-4">
              {role === "buyer" ? (
                <>
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-accent" />
                    <h3 className="text-sm font-semibold text-text-primary">
                      Deposit Escrow via Raast (SadaPay / NayaPay)
                    </h3>
                  </div>

                  <p className="text-xs text-text-secondary leading-relaxed">
                    Transfer the exact amount below using Raast Instant Transfer. Once sent, paste your Transaction Reference Number (TRN) below for swift confirmation.
                  </p>

                  <div className="p-4 rounded-md bg-bg-inset border border-border-default space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-muted">Total to Deposit:</span>
                      <span className="font-mono text-base font-bold text-accent">
                        {totalAmount.toLocaleString()} PKR
                      </span>
                    </div>

                    <div className="pt-2 border-t border-border-subtle flex justify-between items-center text-xs">
                      <div>
                        <span className="block text-[10px] text-text-muted">VaultTrade SadaPay IBAN</span>
                        <span className="font-mono text-xs text-text-primary select-all">
                          {platformIban}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyIban}
                        className="btn-secondary h-7 px-2.5 text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        {copiedIban ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedIban ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleSubmitPayment} className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Raast Reference Number (TRN) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 2026093012345678"
                        value={raastTrn}
                        onChange={(e) => setRaastTrn(e.target.value)}
                        className="w-full h-10 input-inset px-3 text-sm font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Receipt Image Link (Optional)
                      </label>
                      <input
                        type="url"
                        placeholder="https://imgur.com/your-receipt"
                        value={screenshotUrl}
                        onChange={(e) => setScreenshotUrl(e.target.value)}
                        className="w-full h-10 input-inset px-3 text-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingPayment || !raastTrn.trim()}
                      className="w-full btn-primary h-10 text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {submittingPayment ? "Submitting..." : "Submit Payment for Verification"}
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-6 space-y-2">
                  <Clock className="w-8 h-8 text-warning mx-auto animate-pulse" />
                  <h3 className="text-sm font-semibold text-text-primary">
                    Waiting for Buyer Payment
                  </h3>
                  <p className="text-xs text-text-muted max-w-sm mx-auto">
                    The buyer is depositing funds into VaultTrade escrow via Raast. Do not provide credentials until payment is confirmed.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STATE 3: AWAITING CREDENTIALS */}
          {status === "awaiting_credentials" && (
            <>
              {role === "seller" ? (
                <CredentialForm lobbyId={lobby.id} />
              ) : (
                <div className="card-surface p-6 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-success-muted border border-success/30 flex items-center justify-center mx-auto">
                    <Check className="w-5 h-5 text-success" />
                  </div>
                  <h3 className="text-sm font-semibold text-text-primary">
                    Payment Verified & Vaulted
                  </h3>
                  <p className="text-xs text-text-muted max-w-sm mx-auto">
                    Your payment of {totalAmount.toLocaleString()} PKR is securely held in VaultTrade escrow. Waiting for the seller to submit account credentials and First Email (FE).
                  </p>
                </div>
              )}
            </>
          )}

          {/* STATE 4: INSPECTING */}
          {status === "inspecting" && (
            <div className="space-y-5">
              {credentials && role === "buyer" && (
                <CredentialViewer credentials={credentials} />
              )}

              {role === "buyer" ? (
                <>
                  <VerificationChecklist onCompletionChange={setChecklistComplete} />
                  <ReleaseCodeInput lobbyId={lobby.id} disabled={!checklistComplete} />
                  <DisputePanel lobbyId={lobby.id} isDisputed={false} />
                </>
              ) : (
                <div className="card-surface p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-warning" />
                    <h3 className="text-sm font-semibold text-text-primary">
                      Inspection in Progress
                    </h3>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Credentials have been submitted to the buyer. The buyer has 6 hours to inspect the account and enter the 4-digit release code. If the buyer is unresponsive and does not raise a dispute, funds auto-release to you upon timer expiry.
                  </p>
                  <DisputePanel lobbyId={lobby.id} isDisputed={false} />
                </div>
              )}
            </div>
          )}

          {/* STATE 5: DISPUTED */}
          {status === "disputed" && (
            <DisputePanel
              lobbyId={lobby.id}
              isDisputed={true}
              evidenceDeadline={lobby.evidence_deadline}
            />
          )}

          {/* STATE 6: COMPLETED */}
          {status === "completed" && (
            <div className="card-surface p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-success-muted border border-success/30 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-success" />
              </div>
              <h3 className="text-base font-semibold text-text-primary">
                Deal Completed Successfully!
              </h3>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                Ownership verified and escrow released.
              </p>
              {role === "seller" && (
                <div className="p-3 rounded-md bg-bg-inset border border-border-default text-xs text-text-muted mt-3">
                  Seller payout of <strong className="text-text-primary">{lobby.amount.toLocaleString()} PKR</strong> will be disbursed via Raast after the 36-hour safety hold window.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Protected Chat */}
        <div className="lg:col-span-5">
          <LobbyChat lobbyId={lobby.id} currentUserId={currentUserId} />
        </div>
      </div>
    </div>
  );
}
