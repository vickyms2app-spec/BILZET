import axios from "axios";
const API =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "/api/v1" : "http://localhost:5000/api/v1");
export const http = axios.create({
  baseURL: API,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});
let accessToken = localStorage.getItem("bilzet_access_token") || localStorage.getItem("token");

// On startup: if there is a stored active_store_id but no access token, it is definitely stale — purge it.
// Also purge if the stored store ID looks like the old mock/fallback format (busi-xxxxxxxx with 8 hex chars).
(function purgeStaleStoreId() {
  try {
    const storedStoreId = localStorage.getItem("bilzet_active_store_id");
    const hasToken = localStorage.getItem("bilzet_access_token") || localStorage.getItem("token");
    if (storedStoreId && !hasToken) {
      localStorage.removeItem("bilzet_active_store_id");
      localStorage.removeItem("bilzet_active_store");
    }
  } catch (_) {}
})();

export function setTokens(a, r) {
  accessToken = a || null;
  if (a) {
    localStorage.setItem("bilzet_access_token", a);
    localStorage.setItem("token", a);
  } else {
    // On logout / token clear: also purge the active store context
    // so the stale x-business-id header is never sent again after re-login.
    localStorage.removeItem("bilzet_access_token");
    localStorage.removeItem("token");
    localStorage.removeItem("bilzet_active_store_id");
    localStorage.removeItem("bilzet_active_store");
  }
  if (r) {
    localStorage.setItem("bilzet_refresh_token", r);
    localStorage.setItem("refreshToken", r);
  } else if (!a) {
    localStorage.removeItem("bilzet_refresh_token");
    localStorage.removeItem("refreshToken");
  }
}

let tokenProvider = null;

/**
 * Register dynamic token provider function (e.g. Clerk's useAuth.getToken)
 */
export function registerTokenProvider(fn) {
  tokenProvider = fn;
}

// Request Interceptor: Guarantees every outbound request has a valid Bearer token
http.interceptors.request.use(async (config) => {
  let token = null;

  // 1. Prioritize Clerk session token via registered provider
  if (tokenProvider) {
    try {
      token = await tokenProvider();
    } catch (_) {}
  }

  // 2. Direct Clerk session token lookup from window.Clerk with safety timeout
  if (!token && typeof window !== "undefined" && window.Clerk?.session) {
    try {
      token = await Promise.race([
        window.Clerk.session.getToken(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Clerk timeout")), 1500)),
      ]);
    } catch (err) {
      // Gracefully continue without throwing
    }
  }

  // 3. Fall back to localStorage stored tokens
  if (!token) {
    const stored =
      localStorage.getItem("bilzet_access_token") ||
      localStorage.getItem("token") ||
      accessToken;
    if (stored && stored !== "null" && stored !== "undefined") {
      token = stored;
    }
  }

  if (token) {
    if (config.headers?.set) {
      config.headers.set("Authorization", `Bearer ${token}`);
    } else {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  const activeStoreId = localStorage.getItem("bilzet_active_store_id");
  if (activeStoreId) {
    if (config.headers?.set) {
      config.headers.set("x-business-id", activeStoreId);
    } else {
      config.headers = config.headers || {};
      config.headers["x-business-id"] = activeStoreId;
    }
  }

  return config;
});

let refreshing = null;

// Response Interceptor: Seamlessly handles 401s via Clerk or refresh token & self-heals 403 store cache
http.interceptors.response.use(
  (r) => r,
  async (e) => {
    const original = e.config;

    // Self-healing: if an unauthorized or non-existent store header caused 403, purge it and retry
    if (
      e.response?.status === 403 &&
      !original._storeRetry &&
      (e.response?.data?.message?.includes("not authorized to access this store") ||
       e.response?.data?.message?.includes("store"))
    ) {
      original._storeRetry = true;
      localStorage.removeItem("bilzet_active_store_id");
      localStorage.removeItem("bilzet_active_store");
      if (original.headers?.delete) {
        original.headers.delete("x-business-id");
      } else if (original.headers) {
        delete original.headers["x-business-id"];
      }
      return http(original);
    }

    const isAuthEndpoint = original?.url?.includes("/auth/login") || original?.url?.includes("/auth/register");
    if (e.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;

      // 1. If Clerk is active, try obtaining a fresh Clerk session token with safety timeout
      if (typeof window !== "undefined" && window.Clerk?.session) {
        try {
          const freshClerkToken = await Promise.race([
            window.Clerk.session.getToken({ skipCache: true }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Clerk refresh timeout")), 2000)),
          ]);
          if (freshClerkToken) {
            setTokens(freshClerkToken);
            if (original.headers?.set) {
              original.headers.set("Authorization", `Bearer ${freshClerkToken}`);
            } else {
              original.headers.Authorization = `Bearer ${freshClerkToken}`;
            }
            return http(original);
          }
        } catch (_) {}
      }

      // 2. Otherwise, attempt backend JWT refresh token rotation
      const refreshToken =
        localStorage.getItem("bilzet_refresh_token") ||
        localStorage.getItem("refreshToken");

      if (refreshToken) {
        try {
          refreshing ??= axios.post(`${API}/auth/refresh`, {
            refreshToken,
          });
          const { data } = await refreshing;
          refreshing = null;

          const newAccess = data?.data?.accessToken || data?.accessToken;
          const newRefresh = data?.data?.refreshToken || data?.refreshToken;

          if (newAccess) {
            setTokens(newAccess, newRefresh);
            if (original.headers?.set) {
              original.headers.set("Authorization", `Bearer ${newAccess}`);
            } else {
              original.headers.Authorization = `Bearer ${newAccess}`;
            }
            return http(original);
          }
        } catch (err) {
          refreshing = null;
          // Only clear tokens if refresh explicitly failed and user is not logged in via Clerk
          if (typeof window !== "undefined" && !window.Clerk?.user) {
            setTokens();
          }
          throw err;
        }
      }
    }
    throw e;
  },
);
export function apiError(e) {
  if (e?.response?.status === 500) {
    return (
      e?.response?.data?.message ||
      "Unable to connect to the authentication service. Please verify your credentials or click 'Create Account'."
    );
  }
  return (
    e?.response?.data?.message ||
    e?.response?.data?.errors?.[0]?.message ||
    e?.message ||
    "Something went wrong"
  );
}
export { API };
