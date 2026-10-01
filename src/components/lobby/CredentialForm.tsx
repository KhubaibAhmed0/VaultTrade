"use client";

import { useState } from "react";
import { submitCredentialsAction } from "@/app/lobby/[id]/actions";
import { KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle } from "lucide-react";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      await submitCredentialsAction(lobbyId, {
        riotEmail,
        riotPassword,
        firstEmail,
        dateOfBirth,
        socialLogins,
        notes,
      });
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

  return (
    <div className="card-surface p-6">
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
