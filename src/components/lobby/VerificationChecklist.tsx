"use client";

import { useState } from "react";
import { CheckSquare, Square, CheckCircle2 } from "lucide-react";

interface VerificationChecklistProps {
  onCompletionChange: (allChecked: boolean) => void;
}

export function VerificationChecklist({ onCompletionChange }: VerificationChecklistProps) {
  const [checkedItems, setCheckedItems] = useState({
    login: false,
    email: false,
    password: false,
    twoFactor: false,
  });

  const toggleItem = (key: keyof typeof checkedItems) => {
    const updated = { ...checkedItems, [key]: !checkedItems[key] };
    setCheckedItems(updated);
    const allChecked = Object.values(updated).every(Boolean);
    onCompletionChange(allChecked);
  };

  const items = [
    { key: "login", label: "I logged in and verified skins, rank, and account details" },
    { key: "email", label: "I changed the Riot account email to my personal email" },
    { key: "password", label: "I updated the Riot account password" },
    { key: "twoFactor", label: "I enabled Two-Factor Authentication (2FA) on my email/phone" },
  ] as const;

  return (
    <div className="card-surface p-5 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <CheckCircle2 className="w-4 h-4 text-accent" />
        <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
          Buyer Verification Checklist
        </h4>
      </div>
      <p className="text-[11px] text-text-muted">
        Complete all 4 verification steps to unlock the payment release code input.
      </p>

      <div className="space-y-2 pt-1">
        {items.map(({ key, label }) => {
          const isChecked = checkedItems[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleItem(key)}
              className={`w-full p-2.5 rounded-md border text-left flex items-start gap-3 transition-colors cursor-pointer ${
                isChecked
                  ? "bg-bg-elevated border-accent/40 text-text-primary"
                  : "bg-bg-inset border-border-default text-text-secondary hover:border-border-focus"
              }`}
            >
              {isChecked ? (
                <CheckSquare className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              ) : (
                <Square className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
              )}
              <span className="text-xs leading-relaxed">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
