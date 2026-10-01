"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, AlertCircle, ArrowRight } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [displayName, setDisplayName] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    if (displayName.trim().length < 3) {
      setErrorMessage("Display name must be at least 3 characters.");
      setLoading(false);
      return;
    }

    if (!facebookUrl.toLowerCase().includes("facebook.com/")) {
      setErrorMessage("Please enter a valid Facebook profile link (e.g. facebook.com/yourname).");
      setLoading(false);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        display_name: displayName.trim(),
        phone: user.phone || "unknown",
        facebook_url: facebookUrl.trim(),
        is_admin: false,
        banned: false,
        strikes: 0,
        completed_deals: 0,
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        router.push("/dashboard");
      }
    } catch {
      setErrorMessage("Could not save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        {/* Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-12 h-12 rounded-lg bg-bg-surface border border-border-default flex items-center justify-center mb-3">
            <User className="w-6 h-6 text-accent" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Complete Your Trader Profile
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Build trust in the Pakistani Valorant trading community.
          </p>
        </div>

        {/* Form Card */}
        <div className="card-surface p-6">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-md bg-danger-muted border border-danger/40 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <p className="text-xs text-danger leading-relaxed">{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Trading Display Name
              </label>
              <input
                type="text"
                required
                minLength={3}
                placeholder="e.g. AsadTrades"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full h-10 input-inset px-3 text-sm"
                autoFocus
              />
              <p className="text-[11px] text-text-muted mt-1">
                This is what buyers and sellers will see in your lobbies.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Facebook Profile URL
              </label>
              <input
                type="url"
                required
                placeholder="https://facebook.com/your.profile"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                className="w-full h-10 input-inset px-3 text-sm"
              />
              <p className="text-[11px] text-text-muted mt-1">
                Helps group members cross-reference your Facebook group identity.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary h-10 text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? "Saving Profile..." : "Enter VaultTrade"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
