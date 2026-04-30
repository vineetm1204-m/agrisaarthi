"use client";

import type { ClipboardEvent, FormEvent, KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";
import { getAuthToken, setAuthToken } from "@/lib/api";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;
const FARMER_COLLECTION = "farmers";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(
    Array.from({ length: OTP_LENGTH }, () => "")
  );
  const [otpSent, setOtpSent] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(
    null
  );
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const otpValue = useMemo(() => otpDigits.join(""), [otpDigits]);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      router.replace("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  const setupRecaptcha = () => {
    if (typeof window === "undefined") {
      return null;
    }

    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        { size: "invisible" }
      );
      window.recaptchaVerifier.render();
    }

    return window.recaptchaVerifier;
  };

  const normalizePhone = (rawPhone: string) => {
    const digitsOnly = rawPhone.replace(/\D/g, "");
    if (!digitsOnly) {
      return "";
    }

    if (digitsOnly.startsWith("91") && digitsOnly.length >= 12) {
      return `+${digitsOnly}`;
    }

    return `+91${digitsOnly}`;
  };

  const handlePostAuth = async (user: User) => {
    try {
      const token = await user.getIdToken();
      setAuthToken(token);

      try {
        // Check if farmer exists in our database
        const res = await fetch("/api/farmer", {
          headers: {
            "x-farmer-phone": user.phoneNumber ?? "",
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (res.ok) {
          router.replace("/dashboard");
          return;
        }
      } catch (err) {
        console.warn("Failed to check farmer profile.", err);
      }

      // If not found or error checking, proceed to onboarding
      router.replace("/onboarding");
    } catch (err) {
      console.error("Post auth setup failed:", err);
      setError("Authentication completed, but routing failed.");
    }
  };

  const sendOtp = async () => {
    setError(null);
    const normalized = normalizePhone(phone);
    const digitsOnly = normalized.replace(/\D/g, "");

    if (digitsOnly.length < 12) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    const verifier = setupRecaptcha();
    if (!verifier) {
      setError("Recaptcha could not initialize. Try again.");
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithPhoneNumber(auth, normalized, verifier);
      setConfirmation(result);
      setOtpSent(true);
      setCooldown(RESEND_SECONDS);
      setOtpDigits(Array.from({ length: OTP_LENGTH }, () => ""));
      otpRefs.current[0]?.focus();
    } catch (err) {
      console.error("OTP send failed:", err);
      setError("Could not send OTP. Please retry in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError(null);
    if (!confirmation) {
      setError("Please request an OTP first.");
      return;
    }

    if (otpValue.length !== OTP_LENGTH) {
      setError("Enter the 6-digit OTP.");
      return;
    }

    setLoading(true);
    try {
      const result = await confirmation.confirm(otpValue);
      await handlePostAuth(result.user);
    } catch (err) {
      console.error("OTP verification failed:", err);
      setError("Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await handlePostAuth(result.user);
    } catch (err) {
      console.error("Google sign-in failed:", err);
      setError("Google sign-in failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) {
      return;
    }

    const nextDigits = [...otpDigits];
    nextDigits[index] = value;
    setOtpDigits(nextDigits);

    if (value && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH)
      .split("");

    if (!pasted.length) {
      return;
    }

    const nextDigits = Array.from({ length: OTP_LENGTH }, (_, i) => pasted[i] ?? "");
    setOtpDigits(nextDigits);

    const lastIndex = Math.min(pasted.length, OTP_LENGTH) - 1;
    otpRefs.current[lastIndex]?.focus();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (otpSent) {
      await verifyOtp();
    } else {
      await sendOtp();
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-left">
        <div className="auth-left-content">
          <div className="auth-brand">
            <div className="auth-logo">🌾</div>
            <div>
              <div className="auth-title">AgriSaarthi</div>
              <div className="auth-tagline">
                <span>हर किसान का डिजिटल साथी</span>
                <span>Har kisan ka digital saathi</span>
              </div>
            </div>
          </div>

          <div className="auth-highlight">
            Powered for every farm, every season, every language.
          </div>

          <div className="auth-illustration" aria-hidden="true">
            <svg viewBox="0 0 420 320" role="presentation">
              <defs>
                <linearGradient id="field" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#15803d" />
                </linearGradient>
                <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e0f2fe" />
                  <stop offset="100%" stopColor="#bbf7d0" />
                </linearGradient>
              </defs>
              <rect width="420" height="320" rx="28" fill="url(#sky)" />
              <path
                d="M0 230 C90 200 140 210 210 240 C280 270 340 280 420 265 L420 320 L0 320 Z"
                fill="url(#field)"
              />
              <path
                d="M0 210 C80 190 150 195 220 220 C290 245 350 255 420 240"
                stroke="#16a34a"
                strokeWidth="10"
                fill="none"
                opacity="0.6"
              />
              <circle cx="330" cy="80" r="34" fill="#fde047" />
              <rect x="90" y="140" width="60" height="80" rx="16" fill="#166534" />
              <rect x="120" y="120" width="14" height="100" rx="7" fill="#14532d" />
              <circle cx="127" cy="105" r="30" fill="#22c55e" />
              <circle cx="100" cy="110" r="18" fill="#4ade80" />
              <circle cx="150" cy="112" r="16" fill="#86efac" />
              <path
                d="M260 170 C270 150 290 140 310 145 C330 150 340 170 330 190"
                stroke="#166534"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
              />
              <circle cx="300" cy="165" r="18" fill="#4ade80" />
              <circle cx="325" cy="175" r="14" fill="#22c55e" />
            </svg>
          </div>

          <div className="auth-left-footer">India-first guidance. Bharat-ready tools.</div>
        </div>
      </section>

      <section className="auth-right">
        <div className="auth-card animate-fade-in-up">
          <div className="auth-badge">Login</div>
          <h1>Welcome back</h1>
          <p className="auth-subtitle">
            Sign in with your mobile number or continue with Google.
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-label" htmlFor="phone">
              Mobile number
            </label>
            <div className="auth-input-row">
              <span className="auth-prefix">+91</span>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="98765 43210"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="auth-input"
                autoComplete="tel"
                disabled={loading}
              />
            </div>

            {otpSent && (
              <div className="otp-block">
                <label className="auth-label">Enter OTP</label>
                <div className="otp-grid">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        otpRefs.current[index] = el;
                      }}
                      className="otp-input"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(event) =>
                        handleOtpChange(index, event.target.value)
                      }
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      onPaste={handleOtpPaste}
                      disabled={loading}
                      aria-label={`OTP digit ${index + 1}`}
                    />
                  ))}
                </div>
                <div className="otp-meta">
                  <span>
                    {cooldown > 0
                      ? `Resend OTP in ${cooldown}s`
                      : "You can resend now"}
                  </span>
                  <button
                    type="button"
                    className="auth-link"
                    onClick={sendOtp}
                    disabled={cooldown > 0 || loading}
                  >
                    Resend
                  </button>
                </div>
              </div>
            )}

            {error && <div className="auth-error">{error}</div>}

            <button className="btn-primary" type="submit" disabled={loading}>
              {otpSent ? "Verify OTP" : "Send OTP"}
            </button>
            <div id="recaptcha-container" className="recaptcha-container" />
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button
            className="btn-secondary"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <span className="google-icon">G</span>
            Continue with Google
          </button>

          <p className="auth-footnote">
            By continuing you agree to our terms and privacy policy.
          </p>
        </div>
      </section>
    </div>
  );
}
