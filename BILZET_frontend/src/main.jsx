
import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import ErrorBoundary from "./components/common/ErrorBoundary";
import AuthLoadingScreen from "./components/common/AuthLoadingScreen";

import { ClerkProvider } from "@clerk/clerk-react";

import {
  CLERK_PUBLISHABLE_KEY,
  hasClerk,
  isProductionKey,
} from "./config/clerk";

// --------------------------------------------------
// BILZET Authentication Configuration
// --------------------------------------------------

const isProduction = import.meta.env.PROD;

const container = document.getElementById("root");

// --------------------------------------------------
// Authentication Configuration Error Screen
// --------------------------------------------------

function ClerkConfigurationError() {
  return (
    <div
      role="alert"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#F7F9FC",
        color: "#202B3C",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          padding: "32px",
          borderRadius: "16px",
          background: "#FFFFFF",
          border: "1px solid #E7ECF3",
          textAlign: "center",
        }}
      >
        <h2>Authentication Configuration Error</h2>

        <p>
          BILZET authentication could not be initialized.
          Please contact the administrator.
        </p>

        <p style={{ color: "#64748B", fontSize: "14px" }}>
          Please verify the Clerk Production configuration
          and environment variables.
        </p>
      </div>
    </div>
  );
}

// --------------------------------------------------
// Production Key Validation
// --------------------------------------------------

const isClerkConfigured =
  hasClerk &&
  Boolean(CLERK_PUBLISHABLE_KEY) &&
  (!isProduction || isProductionKey);

// --------------------------------------------------
// Application Initialization
// --------------------------------------------------

if (container) {
  const root = createRoot(container);

  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        {isClerkConfigured ? (
          <ClerkProvider
            publishableKey={CLERK_PUBLISHABLE_KEY}
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl="/dashboard"
            signUpFallbackRedirectUrl="/dashboard"
            afterSignOutUrl="/sign-in"
            fallback={
              <AuthLoadingScreen
                message="Initializing BILZET Workspace…"
              />
            }
          >
            <App />
          </ClerkProvider>
        ) : (
          <ClerkConfigurationError />
        )}
      </ErrorBoundary>
    </React.StrictMode>
  );
}
