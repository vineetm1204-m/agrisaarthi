"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Bell, Menu, User, LogOut, CheckCircle, X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { translations } from "@/lib/translations";
import { clearAuthToken } from "@/lib/api";

export default function Navbar() {
  const {
    language,
    setLanguage,
    farmer,
    notifications,
    toggleSidebar,
  } = useAppStore();
  const t = translations[language];

  const router = useRouter();

  const [scrolled, setScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifs(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    useAppStore.getState().setFarmer(null as any); // Clear store
    useAppStore.getState().setFields([]); // Clear fields
    clearAuthToken();
    router.push("/login");
  };

  const unread = notifications.filter((n) => !n.read).length;

  // Initials for avatar
  const initials = farmer
    ? farmer.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "KS";

  return (
    <header className={`navbar${scrolled ? " scrolled" : ""}`}>
      {/* Left — hamburger + logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          className="hamburger-btn"
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <Menu size={22} />
        </button>

        <Link href="/dashboard" className="navbar-brand">
          <span className="navbar-logo">🌾</span>
          <div>
            <div className="navbar-title">AgriSaarthi</div>
            <div className="navbar-tagline">{t.tagline}</div>
          </div>
        </Link>
      </div>

      {/* Right — actions */}
      <div className="navbar-actions">
        {/* Language toggle */}
        <div className="lang-toggle">
          <button
            className={language === "en" ? "active" : ""}
            onClick={() => setLanguage("en")}
          >
            EN
          </button>
          <button
            className={language === "hi" ? "active" : ""}
            onClick={() => setLanguage("hi")}
          >
            हिं
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center">
          <div className={`transition-all duration-300 overflow-hidden flex items-center ${showSearch ? "w-48 mr-2" : "w-0"}`}>
            <input
              type="text"
              placeholder={t.searchPlaceholder || "Search..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              onBlur={() => !searchQuery && setShowSearch(false)}
            />
          </div>
          <button 
            className={`navbar-icon-btn ${showSearch ? "bg-green-50 text-green-600" : ""}`} 
            aria-label={t.searchPlaceholder}
            onClick={() => setShowSearch(!showSearch)}
          >
            {showSearch ? <X size={19} /> : <Search size={19} />}
          </button>
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button 
            className="navbar-icon-btn" 
            aria-label={t.notifications}
            onClick={() => {
              setShowNotifs(!showNotifs);
              setShowProfile(false);
            }}
          >
            <Bell size={19} />
            {unread > 0 && (
              <span className="notification-badge">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
              <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <span className="font-semibold text-sm text-gray-800">Notifications</span>
                <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{unread} New</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div key={n.id} className={`p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.read ? "bg-green-50/30" : ""}`}>
                      <div className="text-sm font-semibold text-gray-800">{n.title}</div>
                      <div className="text-xs text-gray-600 mt-1 line-clamp-2">{n.body}</div>
                      <div className="text-[10px] text-gray-400 mt-2">{new Date(n.createdAt).toLocaleDateString()}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500 flex flex-col items-center">
                    <CheckCircle className="text-green-500 mb-2" size={24} />
                    <span className="text-sm">You're all caught up!</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar / Profile */}
        <div className="relative" ref={profileRef}>
          <div 
            className="navbar-avatar cursor-pointer" 
            title={farmer?.name ?? "Farmer"}
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotifs(false);
            }}
          >
            {initials}
          </div>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
              <div className="p-4 border-b border-gray-100 bg-green-50/50">
                <p className="font-bold text-gray-800">{farmer?.name || "Guest User"}</p>
                <p className="text-xs text-gray-500 mt-0.5">{farmer?.phone || "No phone number"}</p>
                {farmer?.village && (
                  <p className="text-xs text-gray-500 mt-0.5">{farmer.village}, {farmer.district}</p>
                )}
              </div>
              <div className="p-2">
                <Link href="/account" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors w-full" onClick={() => setShowProfile(false)}>
                  <User size={16} className="text-gray-400" />
                  My Account
                </Link>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full text-left mt-1"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
