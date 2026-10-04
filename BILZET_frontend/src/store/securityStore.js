import { create } from "zustand";

export const useSecurityStore = create((set) => ({
  // When an authorized admin is viewing, they can toggle Reveal Secure Details
  adminRevealed: false,
  toggleAdminReveal: () => set((state) => ({ adminRevealed: !state.adminRevealed })),
  setAdminReveal: (val) => set({ adminRevealed: val }),
}));
