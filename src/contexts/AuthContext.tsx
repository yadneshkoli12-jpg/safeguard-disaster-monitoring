"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

type AuthState = {
  loading: boolean;
  session: Session | null;
  profile: UserProfile | null;
};

type AuthContextValue = AuthState & {
  setProfile: (profile: UserProfile) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    loading: true,
    session: null,
    profile: null,
  });

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error || !data) return null;
      return data as UserProfile;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({ loading: false, session, profile });
      } else {
        setState({ loading: false, session: null, profile: null });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({ loading: false, session, profile });
      } else if (event === "SIGNED_OUT") {
        setState({ loading: false, session: null, profile: null });
      } else if (event === "TOKEN_REFRESHED" && session) {
        setState((prev) => ({ ...prev, session }));
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const setProfile = useCallback((profile: UserProfile) => {
    setState((prev) => ({ ...prev, profile }));
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ loading: false, session: null, profile: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, setProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
