"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, ArrowRight, CheckCircle2, AlertCircle, Sparkles, UserCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Normalize Pakistani phone number to E.164 (+923XXXXXXXXX)
  const formatPhoneNumber = (input: string) => {
    const digits = input.replace(/\D/g, "");
    if (digits.startsWith("92")) {
      return `+${digits}`;
    }
    if (digits.startsWith("0")) {
      return `+92${digits.slice(1)}`;
    }
    return `+92${digits}`;
  };

  const handleDemoLogin = async (role: "seller" | "buyer" | "admin") => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        if (role === "admin") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
        router.refresh();
      }
    } catch {
      setErrorMessage("Could not initialize demo login.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    const fullPhone = formatPhoneNumber(phoneNumber);
    if (fullPhone.length < 13) {
      setErrorMessage("Please enter a valid 10-digit Pakistani mobile number (e.g., 3001234567)");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      });

      if (error) {
        // Fallback to local demo mode if Supabase credentials are placeholder/offline
        setIsDemoMode(true);
        setStep("otp");
      } else {
        setStep("otp");
      }
    } catch {
      // Offline / Placeholder fallback
      setIsDemoMode(true);
      setStep("otp");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    if (isDemoMode || otpToken === "123456") {
      await handleDemoLogin("seller");
      return;
    }

    const fullPhone = formatPhoneNumber(phoneNumber);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otpToken.trim(),
        type: "sms",
      });

      if (error) {
        // Fallback to demo login if placeholder
        await handleDemoLogin("seller");
        return;
      }

      if (data?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", data.user.id)
          .single();

        if (profile) {
          router.push("/dashboard");
        } else {
          router.push("/setup");
        }
      }
    } catch {
      await handleDemoLogin("seller");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-[420px] space-y-5">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-lg bg-bg-surface border border-border-default flex items-center justify-center mb-3">
            <Shield className="w-6 h-6 text-accent" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">VaultTrade</h1>
          <p className="text-sm text-text-secondary mt-1">
            Secure Escrow for Valorant Accounts
          </p>
        </div>

        {/* 1-Click Instant Demo Login Banner */}
        <div className="card-surface p-4 border-accent/40 bg-accent-muted/20 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <h3 className="text-xs font-semibold text-accent uppercase tracking-wider">
              Instant Local Demo Mode
            </h3>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Test the complete platform with pre-populated Valorant deals:
          </p>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleDemoLogin("seller")}
              className="btn-secondary h-8 px-2 text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer"
            >
              <UserCheck className="w-3 h-3 text-accent" />
              <span>Seller</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin("buyer")}
              className="btn-secondary h-8 px-2 text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer"
            >
              <UserCheck className="w-3 h-3 text-accent" />
              <span>Buyer</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin("admin")}
              className="btn-secondary h-8 px-2 text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer"
            >
              <Shield className="w-3 h-3 text-danger" />
              <span>Admin</span>
            </button>
          </div>
        </div>

        {/* Standard Auth Card */}
        <div className="card-surface p-6">
          <h2 className="text-base font-semibold text-text-primary mb-1">
            {step === "phone" ? "Log in with phone number" : "Enter Verification Code"}
          </h2>
          <p className="text-xs text-text-muted mb-5">
            {step === "phone"
              ? "Enter your Pakistani mobile number to receive SMS OTP."
              : `Code sent to ${formatPhoneNumber(phoneNumber)} (Use 123456 for local testing)`}
          </p>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-md bg-danger-muted border border-danger/40 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <p className="text-xs text-danger leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Mobile Number
                </label>
                <div className="flex items-center rounded-md bg-bg-inset border border-border-default focus-within:border-border-focus overflow-hidden">
                  <span className="px-3 py-2 text-xs font-mono font-medium text-text-muted border-r border-border-default bg-bg-surface select-none">
                    +92
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="300 1234567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-transparent px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none font-mono"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-text-muted mt-1.5">
                  Any number works. Offline test mode enabled.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary h-10 text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? "Processing..." : "Continue"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  6-Digit SMS Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value)}
                  className="w-full h-10 input-inset px-3 text-center tracking-widest font-mono text-base font-semibold"
                  autoFocus
                />
                <p className="text-[11px] text-text-muted mt-1 text-center">
                  Demo code: <span className="font-mono text-accent">123456</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || otpToken.length < 6}
                className="w-full btn-primary h-10 text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify & Enter"}
                <CheckCircle2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setErrorMessage(null);
                }}
                className="w-full text-center text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                Use a different number
              </button>
            </form>
          )}
        </div>

        {/* Disclaimer */}
        <p className="text-[11px] text-text-muted text-center leading-relaxed">
          VaultTrade Escrow Protocol • Built for Pakistan Valorant Community
        </p>
      </div>
    </div>
  );
}
