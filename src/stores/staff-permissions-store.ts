"use client";

import { create } from "zustand";
import { DEFAULT_STAFF_MENU_PERMISSIONS } from "@/lib/staff-menu-permissions";

interface StaffPermissionsState {
  permissions: string[];
  setPermissions: (permissions: string[]) => void;
}

export const useStaffPermissionsStore = create<StaffPermissionsState>((set) => ({
  permissions: [...DEFAULT_STAFF_MENU_PERMISSIONS],
  setPermissions: (permissions) => set({ permissions }),
}));
