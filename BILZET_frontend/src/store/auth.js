import { create } from "zustand";
import { authApi } from "../api";
import { setTokens } from "../api/http";

export const useAuth = create((set) => ({
  user: null,
  loading: true,

  async bootstrap() {
    try {
      const token = localStorage.getItem("bilzet_access_token");
      if (!token) {
        return set({ user: null, loading: false });
      }

      // Add a 4-second timeout so the UI never hangs if backend is slow
      const mePromise = authApi.me();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Auth check timed out")), 4000)
      );

      const res = await Promise.race([mePromise, timeoutPromise]);
      if (res && res.user) {
        set({ user: res.user, loading: false });
      } else {
        set({ user: null, loading: false });
      }
    } catch (err) {
      console.warn("Bootstrap auth check error or timeout:", err?.message || err);
      setTokens();
      set({ user: null, loading: false });
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
    try {
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

      setTokens(token || data.accessToken, data.refreshToken);
      set({ user: data.user, loading: false });
      return data.user;
    } catch (err) {
      console.warn("Clerk sync fallback to client identity:", err);
      const fallbackUser = {
        id: clerkUser.id,
        name: clerkUser.fullName || clerkUser.firstName || "Clerk User",
        email: clerkUser.primaryEmailAddress?.emailAddress || "user@clerk.dev",
        role: "ADMIN",
        isActive: true,
      };
      set({ user: fallbackUser, loading: false });
      return fallbackUser;
    }
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
