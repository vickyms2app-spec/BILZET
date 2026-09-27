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
