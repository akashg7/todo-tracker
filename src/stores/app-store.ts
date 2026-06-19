"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  theme: "dark" | "light";
  accentColor: "purple" | "blue" | "teal" | "coral" | "amber" | "pink";
  density: "compact" | "comfortable" | "cozy";
  activeWorkspaceId: string | null;
  selectedTaskId: string | null;
  notificationsPanelOpen: boolean;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleCommandPalette: () => void;
  setTheme: (theme: "dark" | "light") => void;
  setAccentColor: (color: AppState["accentColor"]) => void;
  setDensity: (density: AppState["density"]) => void;
  setActiveWorkspaceId: (id: string | null) => void;
  setSelectedTaskId: (id: string | null) => void;
  toggleNotificationsPanel: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      commandPaletteOpen: false,
      theme: "dark",
      accentColor: "purple",
      density: "comfortable",
      activeWorkspaceId: null,
      selectedTaskId: null,
      notificationsPanelOpen: false,

      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) =>
        set({ sidebarCollapsed: collapsed }),
      toggleCommandPalette: () =>
        set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
      setTheme: (theme) => set({ theme }),
      setAccentColor: (accentColor) => set({ accentColor }),
      setDensity: (density) => set({ density }),
      setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
      setSelectedTaskId: (id) => set({ selectedTaskId: id }),
      toggleNotificationsPanel: () =>
        set((s) => ({ notificationsPanelOpen: !s.notificationsPanelOpen })),
    }),
    {
      name: "lifeos-app-store",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        accentColor: state.accentColor,
        density: state.density,
        activeWorkspaceId: state.activeWorkspaceId,
      }),
    }
  )
);
