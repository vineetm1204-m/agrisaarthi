"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import { useAppStore } from "@/lib/store";

function DemoBannerContent() {
  const searchParams = useSearchParams();
  const [isDemo, setIsDemo] = useState(false);
  const setFarmer = useAppStore((state) => state.setFarmer);

  useEffect(() => {
    if (searchParams.get("demo") === "true") {
      setIsDemo(true);
      // Pre-fill fake but realistic farmer data
      setFarmer({
        id: "demo-farmer-001",
        name: "Vineet Mittal",
        phone: "+91 7049915277",
        village: "Demo Village",
        district: "Gwalior",
        state: "Madhya Pradesh",
        language: "hi",
        primaryCrop: "Wheat",
        landSizeAcres: 5,
        sowingDate: "2025-11-15",
        avatarUrl: "",
        ivrEnabled: true,
        ivrNumber: "+19387863936",
      });
      // In a real app, we might also intercept fetch requests or set a cookie 
      // so the backend knows it's demo mode.
    }
  }, [searchParams, setFarmer]);

  if (!isDemo) return null;

  return (
    <div className="bg-yellow-400 text-yellow-900 text-xs sm:text-sm font-semibold px-4 py-2 flex items-center justify-center gap-2 z-50 relative">
      <AlertTriangle className="w-4 h-4" />
      <span>DEMO MODE ACTIVE: Real APIs are being called with mock farmer context.</span>
    </div>
  );
}

export default function DemoBanner() {
  return (
    <Suspense fallback={null}>
      <DemoBannerContent />
    </Suspense>
  );
}
