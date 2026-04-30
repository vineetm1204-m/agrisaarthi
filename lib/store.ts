// ──────────────────────────────────────────────
// AgriSaarthi – Global Zustand store
// ──────────────────────────────────────────────

import { create } from "zustand";
import type { Language, FarmerProfile, Field, Notification } from "./types";

interface AppState {
  // Language
  language: Language;
  setLanguage: (lang: Language) => void;

  // Farmer profile
  farmer: FarmerProfile | null;
  setFarmer: (farmer: FarmerProfile) => void;

  // Fields
  fields: Field[];
  setFields: (fields: Field[]) => void;

  // Notifications
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  unreadCount: () => number;

  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Language — default to Hindi
  language: "hi",
  setLanguage: (lang) => set({ language: lang }),

  // Farmer
  farmer: null,
  setFarmer: (farmer) => set({ farmer }),

  // Fields
  fields: [],
  setFields: (fields) => set({ fields }),

  // Notifications
  notifications: [],
  setNotifications: (notifications) => set({ notifications }),
  unreadCount: () => get().notifications.filter((n) => !n.read).length,

  // Sidebar
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
