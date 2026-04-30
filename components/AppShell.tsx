"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useAppStore } from "@/lib/store";
import { apiFetch } from "@/lib/api";

/**
 * AppShell is the client-side wrapper that:
 *  1. Bootstraps global data from API routes (farmer, notifications)
 *  2. Renders the Navbar + Sidebar + main content area
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { setFarmer, setNotifications, setFields } = useAppStore();
  const pathname = usePathname();
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/onboarding");

  // Fetch farmer profile, notifications, and fields from API on mount
  useEffect(() => {
    if (isAuthRoute) {
      return;
    }

    async function bootstrap() {
      try {
        const [farmerRes, notifRes, fieldsRes] = await Promise.all([
          apiFetch("/api/farmer"),
          apiFetch("/api/notifications"),
          apiFetch("/api/fields"),
        ]);

        if (farmerRes.ok) {
          const data = await farmerRes.json();
          setFarmer(data);
        }
        if (notifRes.ok) {
          const data = await notifRes.json();
          setNotifications(data);
        }
        if (fieldsRes.ok) {
          const data = await fieldsRes.json();
          setFields(data);
        }
      } catch (err) {
        console.error("Bootstrap fetch failed:", err);
      }
    }

    bootstrap();
  }, [isAuthRoute, setFarmer, setNotifications, setFields]);

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <Sidebar />
      <main className="main-content">{children}</main>
    </>
  );
}
