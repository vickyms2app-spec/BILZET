import React, { useEffect, useState } from "react";
import {
  useUser,
  useAuth as useClerkAuth,
  useSignIn,
  useSignUp,
  SignIn,
  SignUp,
  UserButton,
  AuthenticateWithRedirectCallback,
} from "@clerk/clerk-react";
import { useAuth } from "../../store/auth";
import { useNavigate } from "react-router-dom";
import { registerTokenProvider, setTokens } from "../../api/http";

/**
 * ClerkAuthSync
 * Runs globally inside App.jsx whenever a Clerk user is authenticated.
 * Obtains session token, syncs user profile & roles with the backend database,
 * and handles smart onboarding routing vs direct dashboard redirect.
 */
export function ClerkAuthSync() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { getToken } = useClerkAuth();
  const syncClerkUser = useAuth((s) => s.syncClerkUser);
  const navigate = useNavigate();
  const [syncError, setSyncError] = React.useState(null);

  // Register live Clerk session token provider
  useEffect(() => {
    if (isSignedIn && getToken) {
      registerTokenProvider(getToken);
      getToken()
        .then((tok) => {
          if (tok) setTokens(tok);
        })
        .catch(() => {});
    }
  }, [isSignedIn, getToken]);

  useEffect(() => {
    let isCancelled = false;

    if (isLoaded && isSignedIn && clerkUser) {
      getToken()
        .then((token) => syncClerkUser(clerkUser, token))
        .then((appUser) => {
          if (isCancelled) return;

          const currentPath = window.location.pathname;
          // Only redirect if currently on auth pages, sso callback, or root
          if (
            currentPath === "/login" ||
            currentPath === "/register" ||
            currentPath.startsWith("/sign-in") ||
            currentPath.startsWith("/sign-up") ||
            currentPath.startsWith("/sso-callback") ||
            currentPath === "/"
          ) {
            // Check if business profile exists or user needs initial shop onboarding
            const savedSettings = localStorage.getItem("bilzet_invoice_settings");
            const hasLocalSettings = savedSettings && JSON.parse(savedSettings)?.shopName;
            const needsOnboarding = appUser?.isNewUser && !appUser?.hasShopConfig && !hasLocalSettings;

            if (needsOnboarding) {
              navigate("/settings?onboarding=true", { replace: true });
            } else {
              navigate("/dashboard", { replace: true });
            }
          }
        })
        .catch((err) => {
          if (isCancelled) return;
          console.error("Clerk session synchronization failed:", err);
          setSyncError("Unable to connect to the server. Please try again later.");
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [isLoaded, isSignedIn, clerkUser]);

  if (syncError) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: "1rem",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "0.75rem",
          padding: "0.75rem 1.25rem",
          fontSize: "0.75rem",
          color: "#dc2626",
          fontWeight: 600,
          zIndex: 9999,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        {syncError}
      </div>
    );
  }

  return null;
}

/**
 * ClerkGoogleButton
 * Official Google OAuth button powered by Clerk's social connection.
 * Initiates the real Google account chooser flow without window.prompt or mock data.
 */
export function ClerkGoogleButton({ mode = "login", onError, setBusy, busy }) {
  const { signIn, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, isLoaded: isSignUpLoaded } = useSignUp();

  const handleGoogleClick = async () => {
    if (!isSignInLoaded || !isSignUpLoaded) return;
    try {
      if (setBusy) setBusy(true);
      if (onError) onError("");

      const ssoCallbackUrl = `${window.location.origin}/sso-callback`;

      if (mode === "register") {
        await signUp.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: ssoCallbackUrl,
          redirectUrlComplete: `${window.location.origin}/dashboard`,
        });
      } else {
        await signIn.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: ssoCallbackUrl,
          redirectUrlComplete: `${window.location.origin}/dashboard`,
        });
      }
    } catch (err) {
      console.error("Clerk Google OAuth initiation failed:", err);
      if (setBusy) setBusy(false);

      // Extract clear professional error messages without alert() or prompt()
      const isCancelled =
        err?.message?.toLowerCase().includes("cancel") ||
        err?.errors?.[0]?.message?.toLowerCase().includes("cancel") ||
        err?.status === "cancelled";

      if (isCancelled) {
        if (onError) onError("Google sign-in was cancelled.");
      } else if (err?.errors?.[0]?.message) {
        if (onError) onError(err.errors[0].message);
      } else {
        if (onError) onError("Unable to complete Google sign-in. Please try again.");
      }
    }
  };

  return (
    <button
      type="button"
      disabled={busy || !isSignInLoaded}
      onClick={handleGoogleClick}
      className="w-full flex items-center justify-center gap-3 py-2.5 px-4 mb-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/90 text-slate-700 text-xs font-bold transition shadow-2xs hover:shadow-xs active:scale-[0.99]"
    >
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.665-5.17 3.665-9.09z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.09C3.29 21.43 7.37 24 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.28 14.32c-.25-.72-.38-1.49-.38-2.32s.13-1.6.38-2.32V6.59H1.26C.46 8.19 0 9.99 0 12s.46 3.81 1.26 5.41l4.02-3.09z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.29 2.57 1.26 6.59l4.02 3.09c.95-2.83 3.6-4.93 6.72-4.93z"
        />
      </svg>
      <span>Continue with Google</span>
    </button>
  );
}

/**
 * ClerkSsoCallback
 * Handles the OAuth redirect return from Google / Clerk.
 * Completes session handshake and smoothly redirects to dashboard.
 */
export function ClerkSsoCallback() {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-10 h-10 rounded-full animate-spin"
          style={{ border: "3px solid #dbeafe", borderTopColor: "#1a5cff" }}
        />
        <p className="text-sm font-semibold text-slate-800">Authenticating with Google…</p>
        <p className="text-xs text-slate-500">Establishing secure Clerk ERP session</p>
      </div>
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/dashboard"
        signUpForceRedirectUrl="/dashboard"
      />
    </div>
  );
}

export function ClerkAuthBox({ mode = "login" }) {
  return (
    <div className="flex justify-center w-full py-1">
      {mode === "register" ? (
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/dashboard"
          signInForceRedirectUrl="/dashboard"
          signUpForceRedirectUrl="/dashboard"
          appearance={{
            elements: {
              rootBox: "w-full flex justify-center",
              card: "shadow-none border border-slate-200/80 rounded-2xl w-full",
              primaryButton: "bg-[#1a5cff] hover:bg-[#1546c2] text-white font-bold rounded-xl",
            },
          }}
        />
      ) : (
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/dashboard"
          signInForceRedirectUrl="/dashboard"
          signUpForceRedirectUrl="/dashboard"
          appearance={{
            elements: {
              rootBox: "w-full flex justify-center",
              card: "shadow-none border border-slate-200/80 rounded-2xl w-full",
              primaryButton: "bg-[#1a5cff] hover:bg-[#1546c2] text-white font-bold rounded-xl",
            },
          }}
        />
      )}
    </div>
  );
}

export function ClerkUserProfileButton() {
  return (
    <UserButton
      afterSignOutUrl="/login"
      appearance={{
        elements: {
          avatarBox: "w-8 h-8 rounded-full",
        },
      }}
    />
  );
}

export default {
  ClerkAuthSync,
  ClerkGoogleButton,
  ClerkSsoCallback,
  ClerkAuthBox,
  ClerkUserProfileButton,
};
