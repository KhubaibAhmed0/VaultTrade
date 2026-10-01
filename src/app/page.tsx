import Link from "next/link";
import { Shield, Lock, KeyRound, CheckCircle2, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-base flex flex-col justify-between">
      {/* Navigation */}
      <header className="border-b border-border-subtle bg-bg-surface/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-bg-surface border border-border-default flex items-center justify-center">
              <Shield className="w-4 h-4 text-accent" />
            </div>
            <span className="font-bold text-base tracking-tight text-text-primary">
              VaultTrade
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs text-text-secondary hover:text-text-primary transition-colors px-3 py-1.5"
            >
              Dashboard
            </Link>
            <Link
              href="/login"
              className="btn-primary h-8 px-4 text-xs flex items-center gap-1.5"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-4 py-16 sm:py-24 text-center space-y-8 flex-1 flex flex-col justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-muted border border-accent/20 text-xs text-accent mx-auto">
          <Shield className="w-3.5 h-3.5" />
          <span>Anti-Scam Escrow Protocol for Pakistani Gamers</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-text-primary max-w-2xl mx-auto leading-tight">
          Trade Valorant Accounts Without Getting Scammed.
        </h1>

        <p className="text-sm sm:text-base text-text-secondary max-w-xl mx-auto leading-relaxed">
          Stop trusting random Facebook screenshots. VaultTrade locks buyer funds in escrow, verifies credentials, and releases payment via a 4-digit secret code.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/lobby/create"
            className="w-full sm:w-auto btn-primary h-11 px-6 text-sm flex items-center justify-center gap-2"
          >
            <span>Create a Deal Lobby</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto btn-secondary h-11 px-6 text-sm flex items-center justify-center gap-2"
          >
            <span>Sign In with Phone</span>
          </Link>
        </div>

        {/* 3 Step Protocol Workflow */}
        <div className="pt-12">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-6">
            How The 3-Step Protocol Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            {/* Step 1 */}
            <div className="card-surface p-5 space-y-2">
              <div className="w-8 h-8 rounded-md bg-accent-muted border border-accent/30 flex items-center justify-center text-accent text-xs font-bold">
                1
              </div>
              <h3 className="text-sm font-semibold text-text-primary">Lock The Money</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Buyer deposits funds into VaultTrade escrow via Raast (SadaPay/NayaPay). The seller is notified once funds are verified.
              </p>
            </div>

            {/* Step 2 */}
            <div className="card-surface p-5 space-y-2">
              <div className="w-8 h-8 rounded-md bg-accent-muted border border-accent/30 flex items-center justify-center text-accent text-xs font-bold">
                2
              </div>
              <h3 className="text-sm font-semibold text-text-primary">Exchange & Inspect</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Seller submits login credentials and First Email (FE). The buyer logs in, checks skins, and updates email and 2FA.
              </p>
            </div>

            {/* Step 3 */}
            <div className="card-surface p-5 space-y-2">
              <div className="w-8 h-8 rounded-md bg-accent-muted border border-accent/30 flex items-center justify-center text-accent text-xs font-bold">
                3
              </div>
              <h3 className="text-sm font-semibold text-text-primary">4-Digit Release Code</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Buyer enters their secret 4-digit code to release escrow. Auto-release timer protects the seller if the buyer ghosts.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle bg-bg-surface py-8">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-xs text-text-secondary">
            <span className="font-semibold text-text-primary">VaultTrade</span>
            <span>•</span>
            <span>SadaPay / NayaPay Raast Integration</span>
            <span>•</span>
            <span>Zero Chargeback Risk</span>
          </div>

          <p className="text-[11px] text-text-muted max-w-xl mx-auto leading-relaxed">
            VaultTrade is an independent escrow technology protocol and is not affiliated with, endorsed by, or sponsored by Riot Games, Inc. Account trading may violate Riot&apos;s Terms of Service. VaultTrade guarantees secure payment escrow between consenting peers.
          </p>
        </div>
      </footer>
    </div>
  );
}
