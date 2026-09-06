import React from "react";
import { Link } from "react-router-dom";
import { Shield, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import LandingHero from "@/components/landing/LandingHero";
import LandingStats from "@/components/landing/LandingStats";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingFrameworks from "@/components/landing/LandingFrameworks";
import LandingGeo from "@/components/landing/LandingGeo";
import LandingCTA from "@/components/landing/LandingCTA";
import ProductTour from "@/components/landing/ProductTour";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Slim public nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/landing" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
              <Shield className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-foreground tracking-tight">CertiGuard GRC</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#frameworks" className="hover:text-foreground transition-colors">Frameworks</a>
            <a href="#geo" className="hover:text-foreground transition-colors">Coverage</a>
            <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors">
              Sign in
            </Link>
            <button
              onClick={() => {
                try { base44.analytics.track({ eventName: "demo_requested" }); } catch (e) { /* best-effort */ }
                window.location.href = "/register?returnTo=/guided-onboarding";
              }}
              className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors"
            >
              Request a demo
            </button>
            <ProductTour />
            <Link to="/register" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg px-3.5 py-1.5 transition-colors">
              Start free trial <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <LandingHero />
        <LandingStats />
        <LandingFeatures />
        <LandingFrameworks />
        <LandingGeo />
        <LandingCTA />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary">
                  <Shield className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-heading font-bold text-foreground">CertiGuard GRC</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                AI-powered RegTech platform for governance, risk, and compliance across SADC and global markets.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link to="/trust-center" className="hover:text-foreground transition-colors">Trust Center</Link></li>
                <li><Link to="/api-docs" className="hover:text-foreground transition-colors">API Docs</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                <li><Link to="/sla" className="hover:text-foreground transition-colors">SLA</Link></li>
                <li><Link to="/data-residency" className="hover:text-foreground transition-colors">Data Residency</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Security</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/security-overview" className="hover:text-foreground transition-colors">Security Overview</Link></li>
                <li><Link to="/data-privacy" className="hover:text-foreground transition-colors">Data Privacy</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} CertiGuard GRC. All rights reserved.</p>
            <p className="text-xs text-muted-foreground">Built for African and global enterprises.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}