import React, { useState, useEffect } from "react";
import Logo from "./Logo";

/**
 * Standardized High-Performance Loading Screen for Authentication & Session Sync
 * Used across ClerkProvider fallback, Route Guards, and Workspace Hydration.
 */
export default function AuthLoadingScreen({ message = "Verifying Workspace & Permissions…" }) {
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowRetry(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  const handleReload = () => {
    try {
      sessionStorage.removeItem("bilzet_skip_clerk");
    } catch (_) {}
    window.location.reload();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#E3E3E5",
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
          maxWidth: "360px",
          width: "100%",
          background: "#F6F6F8",
          border: "1px solid #E7E8EC",
          borderRadius: "28px",
          padding: "32px 24px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
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
            border: "3px solid #E7E8EC",
            borderTopColor: "#5BF07B",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
        <p style={{ fontSize: "14px", fontWeight: "700", color: "#111318", margin: "4px 0 0" }}>
          {message}
        </p>
        <p style={{ fontSize: "12px", color: "#7C7F8A", margin: 0 }}>
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
              type="button"
              onClick={handleReload}
              style={{
                padding: "8px 16px",
                background: "#12151C",
                color: "#ffffff",
                border: "none",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              Reload Workspace
            </button>
            <a
              href="/sign-in"
              style={{
                fontSize: "11px",
                color: "#7C7F8A",
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
