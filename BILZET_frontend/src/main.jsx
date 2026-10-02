import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { ClerkProvider } from "@clerk/clerk-react";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        {clerkPubKey ? (
          <ClerkProvider publishableKey={clerkPubKey}>
            <App />
          </ClerkProvider>
        ) : (
          <App />
        )}
      </ErrorBoundary>
    </React.StrictMode>
  );
}
