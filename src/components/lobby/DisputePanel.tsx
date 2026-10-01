"use client";

import { useState } from "react";
import { raiseDisputeAction } from "@/app/lobby/[id]/actions";
import { ShieldAlert, AlertTriangle, Clock } from "lucide-react";

interface DisputePanelProps {
  lobbyId: string;
  isDisputed: boolean;
  evidenceDeadline?: string | null;
}

export function DisputePanel({
  lobbyId,
  isDisputed,
  evidenceDeadline,
}: DisputePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRaiseDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setErrorMessage(null);
    setLoading(true);

    try {
      await raiseDisputeAction(lobbyId, reason);
      setIsOpen(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to raise dispute.");
      }
    } finally {
      setLoading(false);
    }
  };

  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceSubmitted, setEvidenceSubmitted] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceUrl.trim()) return;
    setUploadingEvidence(true);
    try {
      const { submitDisputeEvidenceAction } = await import("@/app/lobby/[id]/actions");
      await submitDisputeEvidenceAction(lobbyId, evidenceUrl);
      setEvidenceSubmitted(true);
      setEvidenceUrl("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      }
    } finally {
      setUploadingEvidence(false);
    }
  };

  if (isDisputed) {
    return (
      <div className="card-surface p-5 border-danger/40 bg-danger-muted/20 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-danger" />
          <h4 className="text-sm font-semibold text-danger">Dispute Under Investigation</h4>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          The transaction timer is frozen. The disputing party must upload video evidence of login failure or account discrepancies within the 30-minute evidence window. If no valid proof is uploaded, escrow automatically awards to the seller.
        </p>

        {evidenceDeadline && (
          <div className="flex items-center gap-1.5 text-xs font-mono text-warning bg-bg-inset p-2 rounded border border-warning/30">
            <Clock className="w-3.5 h-3.5" />
            <span>Evidence Deadline: {new Date(evidenceDeadline).toLocaleTimeString()}</span>
          </div>
        )}

        {evidenceSubmitted ? (
          <div className="p-3 rounded-md bg-success-muted border border-success/30 text-xs text-success flex items-center gap-2">
            <span>Evidence link submitted successfully. Admin is reviewing.</span>
          </div>
        ) : (
          <form onSubmit={handleUploadEvidence} className="space-y-2 pt-1">
            <label className="block text-xs font-medium text-text-secondary">
              Upload Video / Screenshot Link (Google Drive / Imgur / YouTube Unlisted)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                required
                placeholder="https://drive.google.com/file/d/..."
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                className="flex-1 h-9 input-inset px-3 text-xs"
              />
              <button
                type="submit"
                disabled={uploadingEvidence || !evidenceUrl.trim()}
                className="btn-danger h-9 px-3 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {uploadingEvidence ? "Submitting..." : "Submit Proof"}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="pt-2">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="text-xs text-text-muted hover:text-danger transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Encountering an issue? Raise a formal dispute
        </button>
      ) : (
        <div className="card-surface p-5 border-danger/30 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-danger" />
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
              Raise Formal Escrow Dispute
            </h4>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Raising a dispute freezes the auto-release timer and triggers an admin investigation. You will be required to submit video proof. Frivolous disputes incur penalties.
          </p>

          {errorMessage && (
            <p className="text-xs text-danger bg-danger-muted p-2.5 rounded-md border border-danger/30">
              {errorMessage}
            </p>
          )}

          <form onSubmit={handleRaiseDispute} className="space-y-3">
            <textarea
              required
              rows={3}
              placeholder="Describe the issue with the credentials, email, or account..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full input-inset p-3 text-xs resize-none"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn-secondary h-8 px-3 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !reason.trim()}
                className="btn-danger h-8 px-4 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Freeze & Raise Dispute"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
