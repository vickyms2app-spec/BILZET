import React, { useState, useEffect } from "react";
import Logo from "./Logo";

/**
 * Standardized High-Performance Loading Screen for Authentication & Session Sync
 * Used across ClerkProvider fallback, Route Guards, and Workspace Hydration.
 * Prevents any white screens and offers a direct 1-click fallback to Local Mode.
 */
export default function AuthLoadingScreen({ message = "Verifying Workspace & Permissions…" }) {
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowRetry(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleContinueLocal = () => {
    sessionStorage.setItem("bilzet_skip_clerk", "true");
    window.location.reload();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F7FBFF",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
          textAlign: "center",
          maxWidth: "320px",
          width: "100%",
        }}
      >
        <div style={{ marginBottom: "8px" }}>
          <Logo theme="light" size="md" />
        </div>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            border: "3px solid #DCEBFA",
            borderTopColor: "#1A5CFF",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
        <p style={{ fontSize: "14px", fontWeight: "700", color: "#1E293B", margin: "4px 0 0" }}>
          {message}
        </p>
        <p style={{ fontSize: "12px", color: "#64748B", margin: 0 }}>
          Synchronizing role profile and business data
        </p>

        {showRetry && (
          <div
            style={{
              marginTop: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              width: "100%",
            }}
          >
            <button
              onClick={handleContinueLocal}
              style={{
                padding: "8px 16px",
                background: "#059669",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              Continue in Local Mode
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "8px 16px",
                background: "#1A5CFF",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Reload Workspace
            </button>
            <a
              href="/sign-in"
              style={{
                fontSize: "11px",
                color: "#64748B",
                textDecoration: "underline",
                marginTop: "4px",
              }}
            >
              Return to Sign In
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

