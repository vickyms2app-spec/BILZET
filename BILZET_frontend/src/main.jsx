import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import ErrorBoundary from "./components/common/ErrorBoundary";
import AuthLoadingScreen from "./components/common/AuthLoadingScreen";

import { ClerkProvider } from "@clerk/clerk-react";

import {
  CLERK_PUBLISHABLE_KEY,
  hasClerk,
  clerkDiagnostics,
} from "./config/clerk";

const container = document.getElementById("root");

/**
 * Authentication Configuration Error Screen
 * Displayed when Clerk credentials are not properly configured in the hosting environment.
 */
function ClerkConfigurationError({ diagnostics }) {
  const isProd = diagnostics?.environment === "production";

  return (
    <div
      role="alert"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#F7FBFF",
        color: "#1E293B",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          padding: "36px 32px",
          borderRadius: "16px",
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
          textAlign: "center",
        }}
      >
        <div style={{ marginBottom: "16px", display: "inline-block" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "#FEE2E2",
              color: "#DC2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto",
              fontSize: "24px",
              fontWeight: "bold",
            }}
          >
            !
          </div>
        </div>

        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0F172A", margin: "0 0 8px" }}>
          Authentication Configuration Required
        </h2>

        <p style={{ fontSize: "14px", color: "#475569", lineHeight: "1.6", margin: "0 0 20px" }}>
          BILZET cannot securely initialize workspace authentication because the Clerk Publishable Key is missing or invalid for this environment.
        </p>

        {/* Diagnostic Card */}
        <div
          style={{
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: "10px",
            padding: "16px",
            textAlign: "left",
            fontSize: "12px",
            color: "#334155",
            marginBottom: "24px",
            fontFamily: "monospace",
          }}
        >
          <div style={{ fontWeight: "700", marginBottom: "8px", color: "#0F172A" }}>
            Environment Diagnostic:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", rowGap: "4px" }}>
            <span style={{ color: "#64748B" }}>Environment:</span>
            <span style={{ fontWeight: "600" }}>{diagnostics?.environment || "unknown"}</span>

            <span style={{ color: "#64748B" }}>Key Provided:</span>
            <span>{diagnostics?.hasKey ? "Yes" : "No"}</span>

            <span style={{ color: "#64748B" }}>Key Prefix:</span>
            <span>{diagnostics?.keyPrefix || "none"}</span>

            <span style={{ color: "#64748B" }}>Status:</span>
            <span style={{ color: "#DC2626", fontWeight: "600" }}>
              {diagnostics?.errorReason || "Invalid Configuration"}
            </span>
          </div>
        </div>

        {/* Guidance */}
        <div style={{ fontSize: "13px", color: "#64748B", lineHeight: "1.5", marginBottom: "24px" }}>
          {isProd ? (
            <span>
              In your <strong>Vercel Project Settings &gt; Environment Variables</strong>, set{" "}
              <code style={{ background: "#F1F5F9", padding: "2px 6px", borderRadius: "4px" }}>
                VITE_CLERK_PUBLISHABLE_KEY
              </code>{" "}
              to your live production key (starting with <code>pk_live_...</code>), then redeploy without build cache.
            </span>
          ) : (
            <span>
              In your local <code>.env</code> file, set{" "}
              <code style={{ background: "#F1F5F9", padding: "2px 6px", borderRadius: "4px" }}>
                VITE_CLERK_PUBLISHABLE_KEY
              </code>{" "}
              to your Clerk publishable key.
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: "10px 24px",
            background: "#1A5CFF",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "background 0.2s",
          }}
        >
          Reload Workspace
        </button>
      </div>
    </div>
  );
}

if (container) {
  const root = createRoot(container);

  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        {hasClerk ? (
          <ClerkProvider
            publishableKey={CLERK_PUBLISHABLE_KEY}
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl="/dashboard"
            signUpFallbackRedirectUrl="/dashboard"
            afterSignOutUrl="/sign-in"
            fallback={<AuthLoadingScreen message="Initializing BILZET Workspace…" />}
          >
            <App />
          </ClerkProvider>
        ) : (
          <ClerkConfigurationError diagnostics={clerkDiagnostics} />
        )}
      </ErrorBoundary>
    </React.StrictMode>
  );
}
