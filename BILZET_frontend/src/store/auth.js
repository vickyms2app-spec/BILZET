import { create } from "zustand";
import { authApi } from "../api";
import { setTokens } from "../api/http";
import { isAdminEmail } from "../utils/security";

export const useAuth = create((set) => ({
  user: null,
  loading: true,

  async bootstrap() {
    try {
      let token =
        localStorage.getItem("bilzet_access_token") ||
        localStorage.getItem("token");

      if (!token && typeof window !== "undefined" && window.Clerk?.session) {
        try {
          token = await window.Clerk.session.getToken();
          if (token) {
            setTokens(token);
          }
        } catch (_) {}
      }

      if (!token) {
        return set({ user: null, loading: false });
      }

      // If Clerk is active, immediately resolve user to prevent UI freeze
      if (typeof window !== "undefined" && window.Clerk?.user) {
        const cu = window.Clerk.user;
        const email = cu.primaryEmailAddress?.emailAddress || cu.emailAddresses?.[0]?.emailAddress;
        const name = cu.fullName || `${cu.firstName || ''} ${cu.lastName || ''}`.trim() || 'Clerk User';
        set({
          user: {
            id: cu.id,
            name,
            email,
            role: "ADMIN",
            isOwner: true,
            isActive: true,
          },
          loading: false,
        });
      }

      // Add a 10-second timeout so the UI never hangs on slow network
      const mePromise = authApi.me();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Auth check timed out")), 10000)
      );

      const res = await Promise.race([mePromise, timeoutPromise]);
      if (res && res.user) {
        set({ user: res.user, loading: false });
      }
    } catch (err) {
      console.warn("Bootstrap auth check notice:", err?.message || err);
      // Only clear user and token if explicitly 401 and Clerk is not signed in
      const isClerkLoggedIn = typeof window !== "undefined" && window.Clerk?.session;
      if (err?.response?.status === 401 && !isClerkLoggedIn) {
        setTokens();
        set({ user: null, loading: false });
      } else {
        set({ loading: false });
      }
    }
  },

  async login(payload) {
    const data = await authApi.login(payload);
    setTokens(data.accessToken, data.refreshToken);
    set({ user: data.user, loading: false });
    return data;
  },

  async register(payload) {
    const data = await authApi.register(payload);
    setTokens(data.accessToken, data.refreshToken);
    set({ user: data.user, loading: false });
    return data;
  },

  async googleLogin(credential) {
    const data = await authApi.googleLogin(credential);
    setTokens(data.accessToken, data.refreshToken);
    set({ user: data.user, loading: false });
    return data;
  },

  async syncClerkUser(clerkUser, token) {
    const email = clerkUser?.primaryEmailAddress?.emailAddress || clerkUser?.emailAddresses?.[0]?.emailAddress || clerkUser?.email;
    const name = clerkUser?.fullName || `${clerkUser?.firstName || ''} ${clerkUser?.lastName || ''}`.trim() || 'Clerk User';
    const phone = clerkUser?.primaryPhoneNumber?.phoneNumber || null;
    const avatar = clerkUser?.imageUrl || null;

    const data = await authApi.clerkSync({
      clerkId: clerkUser.id,
      email,
      name,
      phone,
      avatar,
    });

    // CRITICAL: Always prioritize the backend's persistent 7-day JWT accessToken
    setTokens(data?.accessToken || token, data?.refreshToken);
    set({ user: data.user, loading: false });
    return data.user;
  },

  async logout() {
    try {
      await authApi.logout();
    } catch {
    } finally {
      setTokens();
      set({ user: null, loading: false });
    }
  },
}));
