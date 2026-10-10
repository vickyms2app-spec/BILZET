import { create } from "zustand";
import { storesApi } from "../api";

export const useStore = create((set, get) => ({
  stores: [],
  currentStore: null,
  loading: false,
  switching: false,
  toast: null, // { message: string, type: 'info' | 'success' | 'error' }

  clearToast: () => set({ toast: null }),

  fetchStores: async () => {
    set({ loading: true });
    try {
      const res = await storesApi.list();
      const list = res?.stores || [];
      const currentId = res?.currentStoreId || localStorage.getItem("bilzet_active_store_id");

      let active = list.find((s) => s.id === currentId) || res?.currentStore || list[0] || null;

      if (active) {
        localStorage.setItem("bilzet_active_store_id", active.id);
        localStorage.setItem("bilzet_active_store", JSON.stringify(active));
      }

      set({
        stores: list,
        currentStore: active,
        loading: false,
      });
      return { stores: list, currentStore: active };
    } catch (err) {
      // Fallback from localStorage if offline
      try {
        const saved = JSON.parse(localStorage.getItem("bilzet_active_store") || "null");
        if (saved) {
          set({ currentStore: saved, stores: [saved], loading: false });
          return { stores: [saved], currentStore: saved };
        }
      } catch (_) {}
      set({ loading: false });
    }
  },

  switchStore: async (storeId) => {
    const { stores, currentStore } = get();
    if (currentStore?.id === storeId) return;

    set({
      switching: true,
      toast: { message: "Switching store...", type: "info" },
    });

    try {
      const res = await storesApi.switch(storeId);
      const active = res?.activeStore || stores.find((s) => s.id === storeId);

      if (active) {
        localStorage.setItem("bilzet_active_store_id", active.id);
        localStorage.setItem("bilzet_active_store", JSON.stringify(active));
      }

      // Update tokens if returned
      if (res?.token) {
        localStorage.setItem("bilzet_access_token", res.token);
        localStorage.setItem("token", res.token);
      }

      const updatedStores = stores.map((s) => ({
        ...s,
        isCurrent: s.id === storeId,
      }));

      set({
        stores: updatedStores,
        currentStore: active,
        switching: false,
        toast: { message: "Store switched successfully.", type: "success" },
      });

      // Dispatch global store change event to trigger re-fetches
      window.dispatchEvent(
        new CustomEvent("bilzet:store-changed", { detail: { storeId, store: active } })
      );

      // Auto clear toast after 3 seconds
      setTimeout(() => {
        set((state) => (state.toast?.message === "Store switched successfully." ? { toast: null } : {}));
      }, 3000);

      return active;
    } catch (err) {
      set({
        switching: false,
        toast: { message: "Unable to switch store. Please try again.", type: "error" },
      });

      setTimeout(() => {
        set((state) => (state.toast?.type === "error" ? { toast: null } : {}));
      }, 3500);

      throw err;
    }
  },

  createStore: async (storeData) => {
    set({ switching: true });
    try {
      await storesApi.create(storeData);
      const updated = await get().fetchStores();
      set({
        switching: false,
        toast: { message: "Store branch created successfully.", type: "success" },
      });
      setTimeout(() => set({ toast: null }), 3000);
      return updated;
    } catch (err) {
      set({
        switching: false,
        toast: { message: "Unable to create store. Please try again.", type: "error" },
      });
      setTimeout(() => set({ toast: null }), 3500);
      throw err;
    }
  },
}));

export default useStore;
