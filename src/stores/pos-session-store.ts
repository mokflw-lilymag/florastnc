import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PosProfile {
  id: string;
  role: string;
  full_name: string;
  email: string;
}

interface PosSessionState {
  activeProfile: PosProfile | null;
  setActiveProfile: (profile: PosProfile | null) => void;
  clearSession: () => void;
}

export const usePosSession = create<PosSessionState>()(
  persist(
    (set) => ({
      activeProfile: null,
      setActiveProfile: (profile) => set({ activeProfile: profile }),
      clearSession: () => set({ activeProfile: null }),
    }),
    {
      name: "pos-session-storage",
    }
  )
);
