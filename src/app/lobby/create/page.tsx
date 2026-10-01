"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createLobbyAction } from "@/app/lobby/[id]/actions";
import { calculatePlatformFee } from "@/lib/fee";
import { Shield, ArrowRight, Copy, Check, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function CreateLobbyPage() {
  const router = useRouter();
  const [riotId, setRiotId] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [createdLobbyId, setCreatedLobbyId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const amount = parseInt(amountStr, 10) || 0;
  const platformFee = amount >= 500 ? calculatePlatformFee(amount) : 0;
  const totalBuyerPays = amount + platformFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    if (!riotId.includes("#")) {
      setErrorMessage("Please enter a valid Riot ID with tag (e.g. Reyna#1234).");
      setLoading(false);
      return;
    }

    if (amount < 500) {
      setErrorMessage("Minimum deal amount is 500 PKR.");
      setLoading(false);
      return;
    }

    try {
      const result = await createLobbyAction({
        riotId,
        amount,
      });

      setCreatedLobbyId(result.lobbyId);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to create lobby. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdLobbyId) return;
    const url = `${window.location.origin}/lobby/${createdLobbyId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="min-h-screen bg-bg-base flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-[480px]">
        {/* Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <span className="text-xs font-mono text-accent">VaultTrade Escrow</span>
        </div>

        {/* Card */}
        <div className="card-surface p-6">
          {!createdLobbyId ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-accent" />
                <h2 className="text-base font-semibold text-text-primary">
                  Create Valorant Deal Lobby
                </h2>
              </div>
              <p className="text-xs text-text-secondary mb-5 leading-relaxed">
                Generate a protected escrow room. Share the private link with your buyer. Once they deposit funds, you submit credentials safely.
              </p>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-md bg-danger-muted border border-danger/40 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                  <p className="text-xs text-danger leading-relaxed">{errorMessage}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Valorant Riot ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TenZ#NA1"
                    value={riotId}
                    onChange={(e) => setRiotId(e.target.value)}
                    className="w-full h-10 input-inset px-3 text-sm font-mono"
                    autoFocus
                  />
                  <p className="text-[11px] text-text-muted mt-1">
                    Format: GameName#Tagline. Active lobbies are unique to prevent double-selling.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Asking Price (PKR) *
                  </label>
                  <input
                    type="number"
                    required
                    min={500}
                    placeholder="e.g. 15000"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full h-10 input-inset px-3 text-sm font-mono"
                  />
                </div>

                {amount >= 500 && (
                  <div className="p-3.5 rounded-md bg-bg-inset border border-border-default space-y-1.5">
                    <div className="flex justify-between text-xs text-text-secondary">
                      <span>Seller Payout (You receive):</span>
                      <span className="font-mono text-text-primary font-semibold">
                        {amount.toLocaleString()} PKR
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-text-muted">
                      <span>Platform Fee (Paid by buyer):</span>
                      <span className="font-mono">{platformFee} PKR</span>
                    </div>
                    <div className="pt-1.5 border-t border-border-subtle flex justify-between text-xs font-semibold text-accent">
                      <span>Total Buyer Payment:</span>
                      <span className="font-mono">{totalBuyerPays.toLocaleString()} PKR</span>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || amount < 500 || !riotId.includes("#")}
                    className="w-full btn-primary h-10 text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Creating Escrow Room..." : "Create Deal Lobby"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="space-y-5 text-center py-2">
              <div className="w-12 h-12 rounded-full bg-success-muted border border-success/30 mx-auto flex items-center justify-center">
                <Check className="w-6 h-6 text-success" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-text-primary">
                  Deal Lobby Created!
                </h3>
                <p className="text-xs text-text-secondary mt-1">
                  Share this private link with your buyer on Facebook.
                </p>
              </div>

              <div className="p-3 rounded-md bg-bg-inset border border-border-default flex items-center justify-between text-left">
                <span className="font-mono text-xs text-text-muted truncate mr-2">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/lobby/${createdLobbyId}`
                    : `/lobby/${createdLobbyId}`}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="btn-secondary h-8 px-3 text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-success" />
                      <span className="text-success">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => router.push(`/lobby/${createdLobbyId}`)}
                className="w-full btn-primary h-10 text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                Enter Lobby Now
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
