import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/common/ErrorBoundary";
import AuthLoadingScreen from "./components/common/AuthLoadingScreen";
import { ClerkProvider } from "@clerk/clerk-react";

import { CLERK_PUBLISHABLE_KEY, hasClerk } from "./config/clerk";

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        {hasClerk ? (
          <ClerkProvider
            publishableKey={CLERK_PUBLISHABLE_KEY}
            fallback={<AuthLoadingScreen message="Initializing BILZET Workspace…" />}
          >
            <App />
          </ClerkProvider>
        ) : (
          <App />
        )}
      </ErrorBoundary>
    </React.StrictMode>
  );
}
