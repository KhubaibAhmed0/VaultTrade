"use client";

import { useState } from "react";
import { submitReleaseCodeAction } from "@/app/lobby/[id]/actions";
import { Key, CheckCircle, AlertCircle } from "lucide-react";

interface ReleaseCodeInputProps {
  lobbyId: string;
  disabled: boolean;
}

export function ReleaseCodeInput({ lobbyId, disabled }: ReleaseCodeInputProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || code.length !== 4) return;

    setErrorMessage(null);
    setLoading(true);

    try {
      await submitReleaseCodeAction(lobbyId, code);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to verify release code.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`card-surface p-5 space-y-4 ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
      <div className="flex items-center gap-2">
        <Key className="w-4 h-4 text-success" />
        <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
          Release Payment to Seller
        </h4>
      </div>
      <p className="text-xs text-text-secondary leading-relaxed">
        Enter the 4-digit code provided to you by the seller (or displayed on deal initialization) to confirm you have taken full ownership and release escrow.
      </p>

      {errorMessage && (
        <div className="p-3 rounded-md bg-danger-muted border border-danger/40 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <p className="text-xs text-danger leading-relaxed">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3">
        <input
          type="text"
          maxLength={4}
          disabled={disabled}
          placeholder="0000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="w-full sm:w-36 h-10 input-inset text-center tracking-widest font-mono text-base font-semibold"
        />

        <button
          type="submit"
          disabled={disabled || loading || code.length !== 4}
          className="w-full sm:w-auto flex-1 btn-primary h-10 text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4" />
          {loading ? "Releasing Escrow..." : "Confirm & Finalize Deal"}
        </button>
      </form>
    </div>
  );
}
