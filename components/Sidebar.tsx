"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  Bug,
  Droplets,
  TrendingUp,
  CloudSun,
  Landmark,
  Leaf,
  Phone,
  UserCircle,
  X,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { translations } from "@/lib/translations";

const navItems = [
  { key: "dashboard" as const, href: "/dashboard", icon: LayoutDashboard },
  { key: "myFields" as const, href: "/my-fields", icon: MapPin },
  { key: "diseaseDetection" as const, href: "/disease-detection", icon: Bug },
  { key: "irrigation" as const, href: "/irrigation", icon: Droplets },
  { key: "mandiPrices" as const, href: "/mandi-prices", icon: TrendingUp },
  { key: "weather" as const, href: "/weather", icon: CloudSun },
  { key: "govtSchemes" as const, href: "/govt-schemes", icon: Landmark },
  { key: "carbonCredit" as const, href: "/carbon-credit", icon: Leaf },
  { key: "ivrVoice" as const, href: "/ivr-voice", icon: Phone },
  { key: "account" as const, href: "/account", icon: UserCircle },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { language, sidebarOpen, setSidebarOpen } = useAppStore();
  const t = translations[language as keyof typeof translations] || translations.hi;

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className={`sidebar-backdrop${sidebarOpen ? " visible" : ""}`}
        onClick={closeSidebar}
      />

      <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="sidebar-header">
          <div className="flex items-center gap-2">
            <span className="sidebar-logo-icon">🌾</span>
            <span className="sidebar-logo-text">AgriSaarthi</span>
          </div>
          <button 
            className="lg:hidden p-2 text-gray-400 hover:text-white" 
            onClick={closeSidebar}
          >
            <X size={20} />
          </button>
        </div>
        <nav className="sidebar-nav">
          <span className="sidebar-section-label">
            {language === "hi" ? "मुख्य मेनू" : "Main Menu"}
          </span>

          {navItems.slice(0, 6).map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`sidebar-link${isActive ? " active" : ""}`}
                onClick={closeSidebar}
              >
                <Icon />
                <span>{t[item.key]}</span>
              </Link>
            );
          })}

          <span className="sidebar-section-label">
            {language === "hi" ? "अन्य" : "Others"}
          </span>

          {navItems.slice(6).map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`sidebar-link${isActive ? " active" : ""}`}
                onClick={closeSidebar}
              >
                <Icon />
                <span>{t[item.key]}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer promo */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-card">
            <p>
              <strong>AgriSaarthi</strong>
              <br />
              {language === "hi"
                ? "किसानों के लिए, किसानों द्वारा 🇮🇳"
                : "For farmers, by farmers 🇮🇳"}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
