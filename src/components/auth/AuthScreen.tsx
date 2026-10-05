"use client";

import { ShieldCheck, Eye, EyeOff, AlertCircle, Loader } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/lib/supabase";

type AuthMode = "login" | "signup";

type Props = {
  onAuthenticated: (profile: UserProfile) => void;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span className="auth-field-error" role="alert">
      <AlertCircle size={12} />
      {message}
    </span>
  );
}

export default function AuthScreen({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [busy, setBusy] = useState(false);
  const [globalError, setGlobalError] = useState("");

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup fields
  const [fullName, setFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [age, setAge] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [address, setAddress] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Field-level errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearErrors = () => {
    setErrors({});
    setGlobalError("");
  };

  const validateLogin = () => {
    const newErrors: Record<string, string> = {};
    if (!loginEmail.trim()) newErrors.loginEmail = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail))
      newErrors.loginEmail = "Enter a valid email address.";
    if (!loginPassword) newErrors.loginPassword = "Password is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignup = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = "Full name is required.";
    else if (fullName.trim().length < 2)
      newErrors.fullName = "Name must be at least 2 characters.";
    if (!signupEmail.trim()) newErrors.signupEmail = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail))
      newErrors.signupEmail = "Enter a valid email address.";
    if (!signupPassword) newErrors.signupPassword = "Password is required.";
    else if (signupPassword.length < 8)
      newErrors.signupPassword = "Password must be at least 8 characters.";
    if (!confirmPassword) newErrors.confirmPassword = "Please confirm your password.";
    else if (signupPassword !== confirmPassword)
      newErrors.confirmPassword = "Passwords do not match.";
    if (age && (isNaN(Number(age)) || Number(age) < 1 || Number(age) > 120))
      newErrors.age = "Enter a valid age between 1 and 120.";
    if (contactNumber && !/^[+\d\s\-()]{6,20}$/.test(contactNumber))
      newErrors.contactNumber = "Enter a valid phone number.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    if (!validateLogin()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      if (error) {
        if (error.message === "Failed to fetch" || error.message.includes("Invalid URL")) {
          setGlobalError("Network error: Could not connect to Supabase. Please configure your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file.");
        } else {
          setGlobalError(
            error.message === "Invalid login credentials"
              ? "Email or password is incorrect. Please try again."
              : error.message
          );
        }
        return;
      }
      if (!data.user) {
        setGlobalError("Login failed. Please try again.");
        return;
      }
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();
      if (profileError || !profile) {
        // Create a minimal profile if missing
        const fallbackProfile: UserProfile = {
          id: data.user.id,
          full_name: data.user.email?.split("@")[0] ?? "User",
          email: data.user.email ?? "",
          age: null,
          contact_number: null,
          address: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        onAuthenticated(fallbackProfile);
        return;
      }
      onAuthenticated(profile as UserProfile);
    } catch {
      setGlobalError("An unexpected error occurred. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    if (!validateSignup()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail.trim(),
        password: signupPassword,
        options: {
          data: { full_name: fullName.trim() },
        },
      });
      if (error) {
        if (error.message === "Failed to fetch" || error.message.includes("Invalid URL")) {
          setGlobalError("Network error: Could not connect to Supabase. Please configure your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file.");
        } else if (error.message.toLowerCase().includes("already registered")) {
          setErrors((prev) => ({ ...prev, signupEmail: "This email is already registered. Please log in." }));
        } else {
          setGlobalError(error.message);
        }
        return;
      }
      if (!data.user) {
        setGlobalError("Signup failed. Please try again.");
        return;
      }
      // Create profile record
      const profileData: Omit<UserProfile, "created_at" | "updated_at"> = {
        id: data.user.id,
        full_name: fullName.trim(),
        email: signupEmail.trim(),
        age: age ? Number(age) : null,
        contact_number: contactNumber.trim() || null,
        address: address.trim() || null,
      };
      const { error: insertError } = await supabase
        .from("user_profiles")
        .insert(profileData);
      if (insertError) {
        console.error("Profile insert error:", insertError);
        // Still authenticate even if profile insert fails
      }
      const completeProfile: UserProfile = {
        ...profileData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      onAuthenticated(completeProfile);
    } catch {
      setGlobalError("An unexpected error occurred. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    clearErrors();
  };

  return (
    <div className="auth-page">
      <div className="auth-backdrop" aria-hidden="true">
        <span className="auth-backdrop-orb auth-orb-1" />
        <span className="auth-backdrop-orb auth-orb-2" />
        <span className="auth-backdrop-orb auth-orb-3" />
      </div>

      <div className="auth-container">
        {/* Brand */}
        <div className="auth-brand">
          <span className="auth-brand-mark">
            <ShieldCheck size={26} strokeWidth={2.1} />
          </span>
          <div>
            <strong>SAFEGUARD</strong>
            <small>Awareness · Preparedness</small>
          </div>
        </div>

        {/* Card */}
        <div className="auth-card">
          {/* Tab switcher */}
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={`auth-tab ${mode === "login" ? "auth-tab-active" : ""}`}
              onClick={() => switchMode("login")}
            >
              Log in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              className={`auth-tab ${mode === "signup" ? "auth-tab-active" : ""}`}
              onClick={() => switchMode("signup")}
            >
              Create account
            </button>
          </div>

          {/* Global error */}
          {globalError && (
            <div className="auth-global-error" role="alert">
              <AlertCircle size={16} />
              <span>{globalError}</span>
            </div>
          )}

          {(!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project") || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("example.supabase")) ? (
            <div className="auth-setup-required" style={{ padding: "20px", background: "rgba(174, 84, 80, 0.1)", border: "1px solid rgba(174, 84, 80, 0.3)", borderRadius: "10px", color: "#efb6a8", fontSize: "13px", lineHeight: "1.5" }}>
              <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: "8px", color: "#fff" }}><AlertCircle size={18} /> Authentication Setup Required</h3>
              <p>The authentication system is fully implemented but needs a real database to connect to.</p>
              <ol style={{ paddingLeft: "20px", margin: "12px 0 0" }}>
                <li>Create a free project at <strong>supabase.com</strong></li>
                <li>Go to Project Settings &gt; API</li>
                <li>Copy the URL and anon/public key</li>
                <li>Create a <code>.env.local</code> file in this project folder</li>
                <li>Add:<br/><code style={{ display: "block", background: "rgba(0,0,0,0.3)", padding: "8px", marginTop: "4px", borderRadius: "4px", userSelect: "all" }}>NEXT_PUBLIC_SUPABASE_URL=your-url<br/>NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key</code></li>
                <li>Restart the dev server</li>
              </ol>
            </div>
          ) : mode === "login" ? (
            <form className="auth-form" onSubmit={handleLogin} noValidate>
              <div className="auth-field-group">
                <label className="auth-field">
                  <span>Email address</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={busy}
                    aria-invalid={!!errors.loginEmail}
                  />
                  <FieldError message={errors.loginEmail} />
                </label>

                <label className="auth-field">
                  <span>Password</span>
                  <div className="auth-password-wrap">
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Your password"
                      disabled={busy}
                      aria-invalid={!!errors.loginPassword}
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowLoginPassword((v) => !v)}
                      aria-label={showLoginPassword ? "Hide password" : "Show password"}
                    >
                      {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <FieldError message={errors.loginPassword} />
                </label>
              </div>

              <button type="submit" className="button button-primary button-full auth-submit" disabled={busy}>
                {busy ? <><Loader size={16} className="spin-icon" />Signing in…</> : "Sign in"}
              </button>

              <p className="auth-switch-prompt">
                Don&apos;t have an account?{" "}
                <button type="button" className="auth-switch-link" onClick={() => switchMode("signup")}>
                  Create one
                </button>
              </p>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleSignup} noValidate>
              <div className="auth-section-label">Account details</div>
              <div className="auth-field-group">
                <label className="auth-field">
                  <span>Full name <em>Required</em></span>
                  <input
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    disabled={busy}
                    aria-invalid={!!errors.fullName}
                  />
                  <FieldError message={errors.fullName} />
                </label>

                <label className="auth-field">
                  <span>Email address <em>Required</em></span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={busy}
                    aria-invalid={!!errors.signupEmail}
                  />
                  <FieldError message={errors.signupEmail} />
                </label>

                <label className="auth-field">
                  <span>Password <em>Required</em></span>
                  <div className="auth-password-wrap">
                    <input
                      type={showSignupPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      disabled={busy}
                      aria-invalid={!!errors.signupPassword}
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowSignupPassword((v) => !v)}
                      aria-label={showSignupPassword ? "Hide password" : "Show password"}
                    >
                      {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <FieldError message={errors.signupPassword} />
                </label>

                <label className="auth-field">
                  <span>Confirm password <em>Required</em></span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    disabled={busy}
                    aria-invalid={!!errors.confirmPassword}
                  />
                  <FieldError message={errors.confirmPassword} />
                </label>
              </div>

              <div className="auth-section-label">Profile information <span className="auth-optional-label">Optional</span></div>
              <div className="auth-field-group auth-field-group-row">
                <label className="auth-field">
                  <span>Age</span>
                  <input
                    type="number"
                    autoComplete="age"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Your age"
                    min={1}
                    max={120}
                    disabled={busy}
                    aria-invalid={!!errors.age}
                  />
                  <FieldError message={errors.age} />
                </label>

                <label className="auth-field">
                  <span>Contact number</span>
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    disabled={busy}
                    aria-invalid={!!errors.contactNumber}
                  />
                  <FieldError message={errors.contactNumber} />
                </label>
              </div>

              <label className="auth-field">
                <span>Address</span>
                <textarea
                  autoComplete="street-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Your address (optional)"
                  rows={2}
                  disabled={busy}
                />
              </label>

              <button type="submit" className="button button-primary button-full auth-submit" disabled={busy}>
                {busy ? <><Loader size={16} className="spin-icon" />Creating account…</> : "Create account"}
              </button>

              <p className="auth-switch-prompt">
                Already have an account?{" "}
                <button type="button" className="auth-switch-link" onClick={() => switchMode("login")}>
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>

        <p className="auth-footer-note">
          Safeguard · Disaster Awareness & Preparedness · Data is sourced from public APIs and is not a substitute for official guidance.
        </p>
      </div>
    </div>
  );
}
