"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthScreen from "@/components/auth/AuthScreen";
import SafeguardApp from "@/components/SafeguardApp";
import { ShieldCheck } from "lucide-react";

export default function HomePage() {
  const { loading, session, profile, setProfile } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <span className="auth-loading-brand">
          <ShieldCheck size={28} strokeWidth={2.1} />
        </span>
        <span className="auth-loading-text">Loading Safeguard…</span>
      </div>
    );
  }

  if (!session || !profile) {
    return <AuthScreen onAuthenticated={setProfile} />;
  }

  return <SafeguardApp />;
}
