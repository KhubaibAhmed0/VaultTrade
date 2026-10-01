"use client";

import { useState } from "react";
import { Copy, Check, ShieldAlert, KeyRound, Lock, Calendar, Mail } from "lucide-react";

interface CredentialViewerProps {
  credentials: {
    riot_email: string;
    riot_password: string;
    first_email: string;
    date_of_birth: string;
    social_logins?: string | null;
    notes?: string | null;
  };
}

export function CredentialViewer({ credentials }: CredentialViewerProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="card-surface p-6 space-y-5 select-none">
      <div className="flex items-center gap-2">
        <KeyRound className="w-5 h-5 text-accent" />
        <h3 className="text-base font-semibold text-text-primary">
          Account Credentials & Recovery Details
        </h3>
      </div>

      {/* Security Warning */}
      <div className="p-3 rounded-md bg-warning-muted border border-warning/30 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" />
        <p className="text-xs text-warning leading-relaxed">
          <strong>Security Notice:</strong> Inspect the account immediately. Change the email, password, and enable your own 2-Factor Authentication (2FA) before releasing the 4-digit code. Do not share these credentials outside this lobby.
        </p>
      </div>

      <div className="space-y-3">
        {/* Riot Email */}
        <div className="p-3 rounded-md bg-bg-inset border border-border-default flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Mail className="w-4 h-4 text-text-muted" />
            <div>
              <span className="block text-[11px] font-medium text-text-muted">Riot Login Email</span>
              <span className="font-mono text-sm text-text-primary">{credentials.riot_email}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(credentials.riot_email, "email")}
            className="btn-secondary h-8 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
          >
            {copiedField === "email" ? (
              <>
                <Check className="w-3.5 h-3.5 text-success" />
                <span className="text-success">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Riot Password */}
        <div className="p-3 rounded-md bg-bg-inset border border-border-default flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-text-muted" />
            <div>
              <span className="block text-[11px] font-medium text-text-muted">Riot Password</span>
              <span className="font-mono text-sm text-text-primary">••••••••••••</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(credentials.riot_password, "password")}
            className="btn-secondary h-8 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
          >
            {copiedField === "password" ? (
              <>
                <Check className="w-3.5 h-3.5 text-success" />
                <span className="text-success">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Password</span>
              </>
            )}
          </button>
        </div>

        {/* First Email (FE / OGE) */}
        <div className="p-3 rounded-md bg-bg-inset border border-border-default flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Mail className="w-4 h-4 text-text-muted" />
            <div>
              <span className="block text-[11px] font-medium text-text-muted">First Creation Email (FE)</span>
              <span className="font-mono text-sm text-text-primary">{credentials.first_email}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(credentials.first_email, "fe")}
            className="btn-secondary h-8 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
          >
            {copiedField === "fe" ? (
              <>
                <Check className="w-3.5 h-3.5 text-success" />
                <span className="text-success">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy FE</span>
              </>
            )}
          </button>
        </div>

        {/* Date of Birth */}
        <div className="p-3 rounded-md bg-bg-inset border border-border-default flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-text-muted" />
            <div>
              <span className="block text-[11px] font-medium text-text-muted">Date of Birth (DOB)</span>
              <span className="font-mono text-sm text-text-primary">{credentials.date_of_birth}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(credentials.date_of_birth, "dob")}
            className="btn-secondary h-8 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
          >
            {copiedField === "dob" ? (
              <>
                <Check className="w-3.5 h-3.5 text-success" />
                <span className="text-success">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy DOB</span>
              </>
            )}
          </button>
        </div>

        {credentials.social_logins && (
          <div className="p-3 rounded-md bg-bg-inset border border-border-default">
            <span className="block text-[11px] font-medium text-text-muted mb-0.5">Social Logins</span>
            <p className="text-xs text-text-primary">{credentials.social_logins}</p>
          </div>
        )}

        {credentials.notes && (
          <div className="p-3 rounded-md bg-bg-inset border border-border-default">
            <span className="block text-[11px] font-medium text-text-muted mb-0.5">Seller Notes</span>
            <p className="text-xs text-text-secondary">{credentials.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
