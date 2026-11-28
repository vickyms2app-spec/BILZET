import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import {
  registerTokenProvider,
  setTokens,
} from "../../api/http";
import { getWorkspaceRedirectPath } from "../../utils/workspaceRouter";

/**
 * ClerkAuthSync
 *
 * Synchronizes the authenticated Clerk user with the backend.
 * Redirects authenticated users to onboarding or their workspace.
 */
export function ClerkAuthSync() {
  const {
    user: clerkUser,
    isLoaded,
    isSignedIn,
  } = useUser();

  const { getToken } = useClerkAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const syncClerkUser = useAuth(
    (state) => state.syncClerkUser
  );

  const appUser = useAuth((state) => state.user);

  const syncedUserId = useRef(null);

  const [syncError, setSyncError] = useState(null);

  // Register Clerk's live session token
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !getToken) {
      return;
    }

    registerTokenProvider(getToken);

    getToken()
      .then((token) => {
        if (token) {
          setTokens(token);
        }
      })
      .catch((error) => {
        console.error("Unable to retrieve Clerk token:", error);
      });
  }, [isLoaded, isSignedIn, getToken]);

  // Synchronize Clerk user with the backend
  useEffect(() => {
    let cancelled = false;

    console.log("[AuthDebug][ClerkAuthSync] effect", {
      isLoaded,
      isSignedIn,
      clerkUserId: clerkUser?.id || null,
      appUserId: appUser?.id || null,
      syncedUserId: syncedUserId.current,
      path: location.pathname,
    });

    if (!isLoaded) {
      return;
    }

    if (!isSignedIn || !clerkUser) {
      syncedUserId.current = null;
      setSyncError(null);
      return;
    }

    const clerkUserId = clerkUser.id;

    // Prevent repeated synchronization for the same Clerk user
    if (syncedUserId.current === clerkUserId) {
      return;
    }

    syncedUserId.current = clerkUserId;

    async function synchronizeUser() {
      try {
        registerTokenProvider(getToken);

        let token = await getToken();
        if (!token) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          token = await getToken({ skipCache: true });
        }

        if (!token) {
          throw new Error(
            "Unable to retrieve authentication token."
          );
        }

        const synchronizedUser = await syncClerkUser(
          clerkUser,
          token
        );

        if (cancelled) {
          return;
        }

        setSyncError(null);

        console.log(
          "Clerk user synchronized successfully:",
          clerkUserId
        );

        return synchronizedUser;
      } catch (error) {
        if (cancelled) {
          return;
        }

        // Allow synchronization to retry after failure
        syncedUserId.current = null;

        console.error(
          "Clerk session synchronization failed:",
          error
        );

        setSyncError(
          "Unable to connect to the server. Please try again later."
        );
      }
    }

    synchronizeUser();

    return () => {
      cancelled = true;
    };
  }, [
    isLoaded,
    isSignedIn,
    clerkUser,
    getToken,
    syncClerkUser,
  ]);

  // Redirect after the backend user is available (using React Router, never full-page reload)
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !appUser) {
      return;
    }

    const currentPath = location.pathname;

    // Never interrupt Clerk's OAuth callback handler while on /sso-callback
    if (currentPath.startsWith("/sso-callback")) {
      return;
    }

    const isAuthPage =
      currentPath === "/login" ||
      currentPath === "/register" ||
      currentPath.startsWith("/sign-in") ||
      currentPath.startsWith("/sign-up") ||
      currentPath === "/";

    if (!isAuthPage) {
      return;
    }

    const searchParams = new URLSearchParams(location.search);
    const returnUrl = searchParams.get("returnUrl") || "";
    const isSafeReturnUrl =
      returnUrl &&
      returnUrl.startsWith("/") &&
      !returnUrl.startsWith("/sign-in") &&
      !returnUrl.startsWith("/sign-up") &&
      returnUrl !== "/login" &&
      returnUrl !== "/register";

    if (isSafeReturnUrl) {
      navigate(returnUrl, { replace: true });
      return;
    }

    let hasLocalSettings = false;

    try {
      const savedSettings = localStorage.getItem(
        "bilzet_invoice_settings"
      );

      hasLocalSettings = Boolean(
        savedSettings &&
        JSON.parse(savedSettings)?.shopName
      );
    } catch (error) {
      console.error(
        "Unable to read local onboarding settings:",
        error
      );
    }

    const needsOnboarding =
      appUser?.isNewUser &&
      !appUser?.hasShopConfig &&
      !hasLocalSettings;

    if (needsOnboarding) {
      navigate("/settings?onboarding=true", { replace: true });
      return;
    }

    const destination =
      getWorkspaceRedirectPath(appUser) || "/dashboard";

    if (destination !== currentPath) {
      navigate(destination, { replace: true });
    }
  }, [isLoaded, isSignedIn, appUser, location.pathname, location.search, navigate]);

  if (!syncError) {
    return null;
  }

  return (
    <div
      role="alert"
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

/**
 * ClerkGoogleButton
 *
 * Starts Google OAuth using Clerk.
 */
export function ClerkGoogleButton({
  mode = "login",
  onError,
  setBusy,
  busy,
  className = "",
}) {
  const {
    signIn,
    isLoaded: isSignInLoaded,
  } = useSignIn();

  const {
    signUp,
    isLoaded: isSignUpLoaded,
  } = useSignUp();

  const {
    isLoaded: isUserLoaded,
    isSignedIn,
    user: clerkUser,
  } = useUser();

  const { getToken } = useClerkAuth();
  const navigate = useNavigate();

  const syncClerkUser = useAuth(
    (state) => state.syncClerkUser
  );

  const handleGoogleClick = async () => {
    if (
      !isSignInLoaded ||
      !isSignUpLoaded ||
      !isUserLoaded
    ) {
      onError?.(
        "Google authentication is initializing. Please wait a moment."
      );
      return;
    }

    if (busy) {
      return;
    }

    setBusy?.(true);
    onError?.("");

    try {
      // If a Clerk session already exists, synchronize it
      if (isSignedIn && clerkUser) {
        const token = await getToken();

        if (!token) {
          throw new Error(
            "Unable to retrieve your authentication token."
          );
        }

        const appUser = await syncClerkUser(
          clerkUser,
          token
        );

        const destination =
          getWorkspaceRedirectPath(appUser) ||
          "/dashboard";

        navigate(destination, { replace: true });
        return;
      }

      const callbackUrl =
        `${window.location.origin}/sso-callback`;

      const completeUrl =
        `${window.location.origin}/dashboard`;

      if (mode === "register") {
        await signUp.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: callbackUrl,
          redirectUrlComplete: completeUrl,
        });
      } else {
        await signIn.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: callbackUrl,
          redirectUrlComplete: completeUrl,
        });
      }
    } catch (error) {
      console.error(
        "Clerk Google OAuth error:",
        error
      );

      const errorCode =
        error?.errors?.[0]?.code || "";

      const errorMessage =
        error?.errors?.[0]?.message ||
        error?.message ||
        "";

      const activeClerkUser =
        clerkUser ||
        (typeof window !== "undefined"
          ? window.Clerk?.user
          : null);

      // Handle an existing Clerk session
      if (
        errorCode === "session_exists" &&
        activeClerkUser
      ) {
        try {
          const token = await getToken();

          const appUser = await syncClerkUser(
            activeClerkUser,
            token
          );

          const destination =
            getWorkspaceRedirectPath(appUser) ||
            "/dashboard";

          navigate(destination, { replace: true });
          return;
        } catch (syncError) {
          console.error(
            "Existing Clerk session sync failed:",
            syncError
          );
        }
      }

      const cancelled =
        errorMessage.toLowerCase().includes("cancel") ||
        error?.status === "cancelled";

      if (cancelled) {
        onError?.("Google sign-in was cancelled.");
      } else {
        onError?.(
          errorMessage ||
          "Unable to complete Google sign-in. Please try again."
        );
      }
    } finally {
      setBusy?.(false);
    }
  };

  return (
    <button
      type="button"
      id={
        mode === "register"
          ? "signup-google-btn"
          : "signin-google-btn"
      }
      disabled={busy}
      onClick={handleGoogleClick}
      className={
        className ||
        "w-full h-[48px] rounded-full border border-[#E7E8EC] bg-white hover:bg-[#F6F6F8] text-[#111318] text-[14px] font-semibold transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-xs"
      }
    >
      {busy ? (
        <>
          <span
            className="w-4 h-4 rounded-full animate-spin shrink-0"
            style={{
              border: "2px solid #DCEBFA",
              borderTopColor: "#1A5CFF",
            }}
          />

          <span>Connecting to Google…</span>
        </>
      ) : (
        <>
          <svg
            className="w-4 h-4 shrink-0"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
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
        </>
      )}
    </button>
  );
}

/**
 * ClerkSsoCallback
 *
 * Handles the OAuth redirect from Google / Clerk.
 */
export function ClerkSsoCallback() {
  const [showRetry, setShowRetry] = useState(false);
  const [callbackError, setCallbackError] = useState("");
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();

  useEffect(() => {
    console.log("[AuthDebug][ClerkSsoCallback] state", {
      href: window.location.href,
      isLoaded,
      isSignedIn,
      clerkUserId: clerkUser?.id || null,
      signInStatus: window.Clerk?.client?.signIn?.status || null,
      signUpStatus: window.Clerk?.client?.signUp?.status || null,
    });
  }, [isLoaded, isSignedIn, clerkUser]);

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    const errorParam =
      params.get("error_description") ||
      params.get("error");

    if (errorParam) {
      setCallbackError(
        errorParam.toLowerCase().includes("access_denied")
          ? "Google sign-in was cancelled."
          : "Google authentication could not be completed. Please try again."
      );

      setShowRetry(true);
    }

    const timer = window.setTimeout(() => {
      setShowRetry(true);
    }, 10000);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="min-h-screen grid place-items-center bg-[#F7FBFF]">
      <div className="flex flex-col items-center gap-3 p-6 text-center max-w-sm">
        {!callbackError && (
          <div
            className="w-10 h-10 rounded-full animate-spin"
            style={{
              border: "3px solid #DCEBFA",
              borderTopColor: "#1A5CFF",
            }}
          />
        )}

        <p className="text-sm font-semibold text-[#1E293B]">
          {callbackError ||
            "Authenticating with Google…"}
        </p>

        {!callbackError && (
          <p className="text-xs text-[#64748B]">
            Establishing secure BILZET session
          </p>
        )}

        {showRetry && (
          <div className="mt-4 flex flex-col items-center gap-2">
            {!callbackError && (
              <p className="text-xs text-[#64748B]">
                Taking longer than usual?
              </p>
            )}

            <a
              href="/sign-in"
              className="text-xs font-semibold text-[#1A5CFF] hover:underline"
            >
              Return to Sign In
            </a>
          </div>
        )}
      </div>

      {!callbackError && (
        <AuthenticateWithRedirectCallback
          signInFallbackRedirectUrl="/dashboard"
          signUpFallbackRedirectUrl="/dashboard"
          signInForceRedirectUrl="/dashboard"
          signUpForceRedirectUrl="/dashboard"
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
        />
      )}
    </div>
  );
}

/**
 * ClerkAuthBox
 *
 * Clerk's standard Sign-In and Sign-Up components.
 */
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
              primaryButton:
                "bg-[#1a5cff] hover:bg-[#1546c2] text-white font-bold rounded-xl",
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
              primaryButton:
                "bg-[#1a5cff] hover:bg-[#1546c2] text-white font-bold rounded-xl",
            },
          }}
        />
      )}
    </div>
  );
}

/**
 * ClerkUserProfileButton
 */
export function ClerkUserProfileButton() {
  return (
    <UserButton
      afterSignOutUrl="/sign-in"
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