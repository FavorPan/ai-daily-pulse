"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { AuthModal } from "./AuthModal";

function emailInitials(email: string): string {
  return email.trim().slice(0, 2).toUpperCase();
}

export function AuthButton() {
  const t = useTranslations("nav");
  const { user, isLoading, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // Close on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [menuOpen]);

  if (isLoading) {
    return <div className="w-8 h-8 rounded-full bg-surface-muted animate-pulse" />;
  }

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={() => setAuthOpen(true)}
          className="px-3 py-1.5 rounded-md text-[13px] font-medium border border-border hover:bg-surface-muted transition-colors"
        >
          {t("signIn")}
        </button>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        className="w-8 h-8 rounded-full overflow-hidden border border-border hover:ring-2 hover:ring-accent/40 transition-all shrink-0"
        aria-label={user.email}
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt=""
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="w-full h-full flex items-center justify-center bg-accent text-white text-xs font-semibold">
            {emailInitials(user.email)}
          </span>
        )}
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-background border border-border rounded-lg shadow-xl py-1.5 z-[100] animate-fade-in">
          <div className="px-3 py-2 border-b border-border min-w-0">
            <p className="text-xs text-muted truncate" title={user.email}>
              {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              logout();
            }}
            className="w-full text-left px-3 py-2 text-sm text-muted hover:bg-surface-muted hover:text-foreground transition-colors"
          >
            {t("signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
