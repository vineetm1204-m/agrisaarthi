"use client";

import { type LucideIcon } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { translations, type TranslationKey } from "@/lib/translations";

interface PlaceholderPageProps {
  titleKey: TranslationKey;
  icon: LucideIcon;
}

export default function PlaceholderPage({
  titleKey,
  icon: Icon,
}: PlaceholderPageProps) {
  const { language } = useAppStore();
  const t = translations[language];

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <h1>{t[titleKey]}</h1>
      </div>

      <div className="placeholder-card">
        <div className="placeholder-icon">
          <Icon size={32} />
        </div>
        <h2>{t.comingSoon}</h2>
        <p>{t.pageDescription}</p>
      </div>
    </div>
  );
}
