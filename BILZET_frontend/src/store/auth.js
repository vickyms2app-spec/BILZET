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
          token = await Promise.race([
            window.Clerk.session.getToken(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Clerk token timeout")), 1500)),
          ]);
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
        const isSuper = email === 'vickyms2app@gmail.com' || email === 'admin@bilzet.com' || email === 'vicky@bilzet.com';
        set({
          user: {
            id: cu.id,
            name,
            email,
            role: isSuper ? "SUPER_ADMIN" : "ADMIN",
            isOwner: true,
            isActive: true,
            subscription: {
              planTier: isSuper ? "PREMIUM" : "FREE",
              planName: isSuper ? "Premium Enterprise" : "Free Starter",
              status: "ACTIVE",
              isActive: true,
              isUnlimited: isSuper,
              maxSubUsers: isSuper ? -1 : 0,
            },
            currentPlan: isSuper ? "PREMIUM" : "FREE",
          },
          loading: false,
        });
      }

      // Add a 6-second timeout so the UI never hangs on slow network
      const mePromise = authApi.me();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Auth check timed out")), 6000)
      );

      const res = await Promise.race([mePromise, timeoutPromise]);
      if (res && res.user) {
        let sub = res.user.subscription;
        if (!sub) {
          sub = {
            planTier: res.user.currentPlan || "FREE",
            planName: (res.user.currentPlan === "PREMIUM" ? "Premium Enterprise" : res.user.currentPlan === "PRO" ? "Pro Business" : "Free Starter"),
            status: "ACTIVE",
            isActive: true,
            isUnlimited: res.user.currentPlan === "PRO" || res.user.currentPlan === "PREMIUM",
            maxSubUsers: res.user.currentPlan === "PREMIUM" ? -1 : res.user.currentPlan === "PRO" ? 5 : 0,
            expiresAt: null,
          };
          res.user.subscription = sub;
        }
        const tier = String(sub.planTier || res.user.currentPlan || "FREE").toUpperCase();
        const cap = tier.charAt(0) + tier.slice(1).toLowerCase();
        try {
          localStorage.setItem(
            "bilzet_subscription_data",
            JSON.stringify({
              currentPlan: cap,
              planTier: tier,
              status: sub.status || "ACTIVE",
              expiresAt: sub.expiresAt,
              isActive: sub.isActive !== false,
              planName: sub.planName || (tier === 'PREMIUM' ? 'Premium Enterprise' : tier === 'PRO' ? 'Pro Business' : 'Free Starter'),
            })
          );
          localStorage.setItem(
            "bilzet_subscription",
            JSON.stringify({
              currentPlan: cap,
              status: sub.status || "Active",
              totalBills: sub.isUnlimited ? "Unlimited" : "100 bills / year",
              usedBills: 0,
            })
          );
        } catch (_) {}
        set({ user: res.user, loading: false });
      }
    } catch (err) {
      console.warn("Bootstrap auth check notice:", err?.message || err);
      // Cleanly clear invalid token so user is not stuck on infinite loading
      const isClerkLoggedIn = typeof window !== "undefined" && window.Clerk?.session;
      if (!isClerkLoggedIn) {
        setTokens();
        set({ user: null, loading: false });
      } else {
        set({ loading: false });
      }
    }
  },

  async refreshUser() {
    try {
      const res = await authApi.me();
      if (res && res.user) {
        set({ user: res.user });
        return res.user;
      }
    } catch (err) {
      console.warn("refreshUser failed:", err?.message);
    }
  },

  updateSubscription(newSub) {
    if (!newSub) return;
    const tierUpper = String(newSub.planTier || newSub.currentPlan || "FREE").toUpperCase();
    const tierCap = tierUpper.charAt(0) + tierUpper.slice(1).toLowerCase();

    set((state) => {
      if (!state.user) return state;
      return {
        user: {
          ...state.user,
          subscription: newSub,
          currentPlan: tierUpper,
        },
      };
    });

    try {
      localStorage.setItem(
        "bilzet_subscription_data",
        JSON.stringify({
          currentPlan: tierCap,
          planTier: tierUpper,
          status: newSub.status || "ACTIVE",
          expiresAt: newSub.expiresAt,
          isActive: newSub.isActive !== false,
          planName: newSub.planName,
        })
      );
    } catch (_) {}
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
    if (!clerkUser) return null;
    const email =
      clerkUser?.primaryEmailAddress?.emailAddress ||
      clerkUser?.emailAddresses?.[0]?.emailAddress ||
      clerkUser?.email ||
      (clerkUser?.id ? `${clerkUser.id}@clerk.bilzet.internal` : 'user@bilzet.com');
    const name = clerkUser?.fullName || `${clerkUser?.firstName || ''} ${clerkUser?.lastName || ''}`.trim() || 'Clerk User';
    const phone = clerkUser?.primaryPhoneNumber?.phoneNumber || null;
    const avatar = clerkUser?.imageUrl || null;

    let data = null;
    try {
      data = await authApi.clerkSync({
        clerkId: clerkUser.id,
        email,
        name,
        phone,
        avatar,
      });
    } catch (syncErr) {
      console.warn("Backend Clerk sync warning, creating resilient local session:", syncErr);
      const isSuper = email === 'vickyms2app@gmail.com' || email === 'admin@bilzet.com' || email === 'vicky@bilzet.com';
      data = {
        user: {
          id: clerkUser.id || 'clerk-user',
          name,
          email,
          phone,
          avatar,
          role: isSuper ? 'SUPER_ADMIN' : 'ADMIN',
          businessId: isSuper ? null : 'busi-01',
          isOwner: true,
          isActive: true,
          subscription: {
            planTier: isSuper ? 'PREMIUM' : 'FREE',
            actualPlanTier: isSuper ? 'PREMIUM' : 'FREE',
            planName: isSuper ? 'Premium Enterprise' : 'Free Starter',
            status: 'ACTIVE',
            isActive: true,
            isUnlimited: isSuper,
            maxSubUsers: isSuper ? -1 : 0,
          },
          currentPlan: isSuper ? 'PREMIUM' : 'FREE',
          isNewUser: false,
          hasShopConfig: true,
        },
        accessToken: token,
        refreshToken: null,
      };
    }

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

export const useAuthStore = useAuth;
