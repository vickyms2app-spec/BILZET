import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import ErrorBoundary from "./components/common/ErrorBoundary";
import AuthLoadingScreen from "./components/common/AuthLoadingScreen";
import Logo from "./components/common/Logo";

import { ClerkProvider } from "@clerk/clerk-react";

import {
  CLERK_PUBLISHABLE_KEY,
  hasClerk,
  clerkDiagnostics,
} from "./config/clerk";

const container = document.getElementById("root");

/**
 * Professional BILZET Authentication Error Screen
 * Displayed when Clerk Publishable Key is missing, invalid, or mismatched with environment.
 */
function ClerkConfigurationError({ diagnostics }) {
  const isProd = diagnostics?.environment === "production";
  const hasKey = Boolean(diagnostics?.keyExists);

  // Compute validation status description
  let validationStatus = "Valid";
  if (!hasKey) {
    validationStatus = "Missing Publishable Key";
  } else if (diagnostics?.keyLength < 32) {
    validationStatus = "Invalid: Key length < 32 characters";
  } else if (isProd && !diagnostics?.isProductionKey) {
    validationStatus = "Invalid: Development key (pk_test_) rejected in Production";
  } else if (!diagnostics?.isProductionKey && !diagnostics?.isDevelopmentKey) {
    validationStatus = "Invalid: Key must start with pk_live_ or pk_test_";
  } else if (!diagnostics?.isKeyValid) {
    validationStatus = "Invalid Key Format";
  }

  return (
    <div
      role="alert"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#F8FAFC",
        color: "#1E293B",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.02)",
          textAlign: "center",
        }}
      >
        {/* BILZET Brand Header */}
        <div style={{ marginBottom: "20px", display: "flex", justifyContent: "center" }}>
          <Logo theme="light" size="md" />
        </div>

        {/* Error Warning Icon */}
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
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          </div>
        </div>

        <h2 style={{ fontSize: "19px", fontWeight: "700", color: "#0F172A", margin: "0 0 8px" }}>
          Authentication Configuration Required
        </h2>

        <p style={{ fontSize: "14px", color: "#64748B", lineHeight: "1.5", margin: "0 0 24px" }}>
          BILZET cannot securely initialize workspace authentication because the Clerk Publishable Key is missing or invalid.
        </p>

        {/* Diagnostic Information Panel */}
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
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          }}
        >
          <div style={{ fontWeight: "700", marginBottom: "10px", color: "#0F172A", letterSpacing: "0.02em" }}>
            Clerk Configuration Diagnostics:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", rowGap: "6px" }}>
            <span style={{ color: "#64748B" }}>Environment:</span>
            <span style={{ fontWeight: "600" }}>{diagnostics?.environment || "unknown"}</span>

            <span style={{ color: "#64748B" }}>Key Provided:</span>
            <span style={{ fontWeight: "600", color: hasKey ? "#16A34A" : "#DC2626" }}>
              {hasKey ? "Yes" : "No"}
            </span>

            <span style={{ color: "#64748B" }}>Key Prefix:</span>
            <span>{diagnostics?.keyPrefix || "none"}</span>

            <span style={{ color: "#64748B" }}>Key Length:</span>
            <span>{diagnostics?.keyLength || 0}</span>

            <span style={{ color: "#64748B" }}>Validation Status:</span>
            <span style={{ color: diagnostics?.isKeyValid ? "#16A34A" : "#DC2626", fontWeight: "600" }}>
              {validationStatus}
            </span>
          </div>
        </div>

        {/* Environment-Specific Instructions */}
        <div
          style={{
            fontSize: "13px",
            color: "#475569",
            lineHeight: "1.6",
            background: "#EFF6FF",
            border: "1px solid #BFDBFE",
            borderRadius: "10px",
            padding: "14px",
            marginBottom: "24px",
            textAlign: "left",
          }}
        >
          <div style={{ fontWeight: "700", color: "#1E40AF", marginBottom: "4px" }}>
            Action Required:
          </div>
          {isProd ? (
            <div>
              Configure <code>VITE_CLERK_PUBLISHABLE_KEY</code> in{" "}
              <strong>Vercel &rarr; Project Settings &rarr; Environment Variables</strong>. Select{" "}
              <strong>Production</strong> and use your Clerk Production Publishable Key (<code>pk_live_...</code>).
              Then redeploy with build cache un-checked.
            </div>
          ) : (
            <div>
              Configure <code>VITE_CLERK_PUBLISHABLE_KEY</code> in your frontend <code>.env</code> file
              using your Clerk Development Publishable Key (<code>pk_test_...</code>).
            </div>
          )}
        </div>

        {/* Reload Workspace CTA */}
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            width: "100%",
            height: "42px",
            background: "#1A5CFF",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "9px",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "background 0.2s",
            boxShadow: "0 2px 4px rgba(26, 92, 255, 0.2)",
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
