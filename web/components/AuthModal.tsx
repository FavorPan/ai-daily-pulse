"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api.ai-daily-pulse.top";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AuthModal({ open, onClose }: Props) {
  const t = useTranslations("insight");
  const { refresh } = useAuth();
  const [mode, setMode] = useState<"select" | "email" | "verify">("select");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open) return null;

  const handleOAuth = (provider: "github" | "google") => {
    window.location.href = `${API_BASE}/api/auth/${provider}`;
  };

  const handleSendCode = async () => {
    if (!email.includes("@")) {
      setError(t("authInvalidEmail"));
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed");
      setMode("verify");
    } catch {
      setError(t("authSendFailed"));
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/email/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, code }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? t("authVerifyFailed"));
        return;
      }
      await refresh();
      onClose();
      setMode("select");
      setEmail("");
      setCode("");
    } catch {
      setError(t("authVerifyFailed"));
    }
  };

  // Render into <body> via portal so the fixed overlay escapes the sticky
  // header's stacking context and centers relative to the viewport.
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-lg p-6 w-full max-w-sm mx-4 shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted hover:text-foreground text-lg"
          aria-label="Close"
        >
          ✕
        </button>

        <h2 className="text-lg font-semibold mb-4">{t("authTitle")}</h2>

        {mode === "select" && (
          <div className="space-y-3">
            <button
              onClick={() => handleOAuth("github")}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-border hover:bg-surface-muted transition-colors text-sm font-medium"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              {t("authGithub")}
            </button>

            <button
              onClick={() => handleOAuth("google")}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-border hover:bg-surface-muted transition-colors text-sm font-medium"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {t("authGoogle")}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted">{t("authOr")}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              onClick={() => setMode("email")}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-border hover:bg-surface-muted transition-colors text-sm font-medium"
            >
              ✉️ {t("authEmail")}
            </button>
          </div>
        )}

        {mode === "email" && (
          <div className="space-y-3">
            <p className="text-sm text-muted">{t("authEmailHint")}</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-foreground placeholder:text-muted"
              autoFocus
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setMode("select"); setError(""); }}
                className="flex-1 px-4 py-2 rounded-md border border-border text-sm hover:bg-surface-muted transition-colors"
              >
                {t("authBack")}
              </button>
              <button
                onClick={handleSendCode}
                disabled={sending}
                className="flex-1 px-4 py-2 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {sending ? t("authSending") : t("authSendCode")}
              </button>
            </div>
          </div>
        )}

        {mode === "verify" && (
          <div className="space-y-3">
            <p className="text-sm text-muted">{t("authVerifyHint", { email })}</p>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-foreground placeholder:text-muted text-center text-2xl tracking-[0.3em]"
              autoFocus
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setMode("email"); setError(""); }}
                className="flex-1 px-4 py-2 rounded-md border border-border text-sm hover:bg-surface-muted transition-colors"
              >
                {t("authBack")}
              </button>
              <button
                onClick={handleVerify}
                disabled={code.length !== 6}
                className="flex-1 px-4 py-2 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {t("authVerify")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    ,
    document.body
  );
}
