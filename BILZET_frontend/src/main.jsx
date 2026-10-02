import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { ClerkProvider } from "@clerk/clerk-react";

import { CLERK_PUBLISHABLE_KEY } from "./config/clerk";

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        {CLERK_PUBLISHABLE_KEY ? (
          <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
            <App />
          </ClerkProvider>
        ) : (
          <App />
        )}
      </ErrorBoundary>
    </React.StrictMode>
  );
}
