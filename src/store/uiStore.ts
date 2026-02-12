import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIStore {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,

      toggleSidebar: () => {
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed }));
      },

      setSidebarCollapsed: (collapsed: boolean) => {
        set({ isSidebarCollapsed: collapsed });
      },
    }),
    {
      name: "ui-storage",
    },
  ),
);

export { useUIStore };
