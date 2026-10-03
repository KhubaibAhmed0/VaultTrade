"use client";

import { useState } from "react";
import { submitCredentialsAction } from "@/app/lobby/[id]/actions";
import { KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle, Copy, Check } from "lucide-react";

interface CredentialFormProps {
  lobbyId: string;
}

export function CredentialForm({ lobbyId }: CredentialFormProps) {
  const [riotEmail, setRiotEmail] = useState("");
  const [riotPassword, setRiotPassword] = useState("");
  const [firstEmail, setFirstEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [socialLogins, setSocialLogins] = useState("");
  const [notes, setNotes] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [revealedCode, setRevealedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await submitCredentialsAction(lobbyId, {
        riotEmail,
        riotPassword,
        firstEmail,
        dateOfBirth,
        socialLogins,
        notes,
      });

      if (res && res.releaseCode) {
        setRevealedCode(res.releaseCode);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to submit credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!revealedCode) return;
    navigator.clipboard.writeText(revealedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };


  return (
    <div className="card-surface p-6 relative">
      {/* 4-Digit Release Code One-Time Reveal Modal */}
      {revealedCode && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-surface max-w-md w-full p-6 border-accent/40 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-success" />
              <h3 className="text-base font-bold text-text-primary">
                Credentials Deposited & Release Code Issued
              </h3>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Your credentials are securely locked in escrow. Save this 4-digit code now. The buyer must confirm or provide this code once they inspect the account before your funds are released.
            </p>

            <div className="p-4 rounded-lg bg-bg-inset border border-accent/30 flex items-center justify-between">
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-text-muted font-medium mb-1">
                  Secret Release Code
                </span>
                <span className="text-3xl font-mono font-bold tracking-widest text-accent">
                  {revealedCode}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="btn-secondary h-9 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-success" />
                    <span className="text-success font-medium">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3 rounded bg-warning-muted/30 border border-warning/30 text-xs text-warning leading-relaxed">
              ⚠️ <strong>Warning:</strong> Do not share this release code with the buyer until they have verified the account details and completed the email change.
            </div>

            <button
              type="button"
              onClick={() => {
                setRevealedCode(null);
                window.location.reload();
              }}
              className="w-full btn-primary h-10 text-xs font-semibold cursor-pointer"
            >
              I Have Saved This Code — Proceed to Lobby
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-2">
        <KeyRound className="w-5 h-5 text-accent" />
        <h3 className="text-base font-semibold text-text-primary">
          Submit Valorant Credentials
        </h3>
      </div>
      <p className="text-xs text-text-secondary mb-5 leading-relaxed">
        Buyer funds are confirmed and locked in escrow. Provide the login details and recovery proof below. Once submitted, the 6-hour inspection timer will start.
      </p>

      {errorMessage && (
        <div className="mb-4 p-3 rounded-md bg-danger-muted border border-danger/40 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <p className="text-xs text-danger leading-relaxed">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Riot Login Email / Username *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. account_login@gmail.com"
              value={riotEmail}
              onChange={(e) => setRiotEmail(e.target.value)}
              className="w-full h-10 input-inset px-3 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Riot Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••••••"
                value={riotPassword}
                onChange={(e) => setRiotPassword(e.target.value)}
                className="w-full h-10 input-inset px-3 pr-10 text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-text-muted hover:text-text-secondary"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              First Email (FE / OGE) *
            </label>
            <input
              type="email"
              required
              placeholder="first_created_email@gmail.com"
              value={firstEmail}
              onChange={(e) => setFirstEmail(e.target.value)}
              className="w-full h-10 input-inset px-3 text-sm font-mono"
            />
            <p className="text-[11px] text-text-muted mt-1">
              The first email ever used to create this account.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Date of Birth (DOB) *
            </label>
            <input
              type="text"
              required
              placeholder="DD/MM/YYYY"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full h-10 input-inset px-3 text-sm font-mono"
            />
            <p className="text-[11px] text-text-muted mt-1">
              Required by Riot for recovery verification.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Linked Socials (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Google unlinked, Facebook unlinked"
            value={socialLogins}
            onChange={(e) => setSocialLogins(e.target.value)}
            className="w-full h-10 input-inset px-3 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Additional Account Notes (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Peak rank Diamond 2, includes Prime Vandal and Reaver Sheriff"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full input-inset p-3 text-sm resize-none"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary h-11 text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            {loading ? "Submitting Securely..." : "Submit Credentials to Buyer"}
          </button>
        </div>
      </form>
    </div>
  );
}
