// ──────────────────────────────────────────────
// AgriSaarthi – i18n translation strings
// ──────────────────────────────────────────────

export const translations = {
  en: {
    // Navbar
    tagline: "Har kisan ka digital saathi",
    searchPlaceholder: "Search…",
    notifications: "Notifications",

    // Sidebar
    dashboard: "Dashboard",
    myFields: "My Fields",
    diseaseDetection: "Disease Detection",
    irrigation: "Irrigation",
    mandiPrices: "Mandi Prices",
    weather: "Weather",
    govtSchemes: "Govt Schemes",
    carbonCredit: "Carbon Credits",
    ivrVoice: "IVR / Voice",
    account: "Account",

    // Page titles
    dashboardTitle: "Dashboard",
    myFieldsTitle: "My Fields",
    diseaseDetectionTitle: "Disease Detection",
    irrigationTitle: "Irrigation Advisory",
    mandiPricesTitle: "Mandi Prices",
    weatherTitle: "Weather Forecast",
    govtSchemesTitle: "Government Schemes",
    carbonCreditTitle: "Carbon Credit Calculator",
    ivrVoiceTitle: "IVR / Voice Assistant",
    accountTitle: "Account Settings",

    // Misc
    loading: "Loading…",
    comingSoon: "Coming Soon",
    pageDescription: "This section is under development. Check back soon!",
    welcomeBack: "Welcome back",
    noNotifications: "No new notifications",
  },

  hi: {
    // Navbar
    tagline: "हर किसान का डिजिटल साथी",
    searchPlaceholder: "खोजें…",
    notifications: "सूचनाएँ",

    // Sidebar
    dashboard: "डैशबोर्ड",
    myFields: "मेरे खेत",
    diseaseDetection: "रोग पहचान",
    irrigation: "सिंचाई",
    mandiPrices: "मंडी भाव",
    weather: "मौसम",
    govtSchemes: "सरकारी योजनाएँ",
    carbonCredit: "कार्बन क्रेडिट",
    ivrVoice: "IVR / आवाज़",
    account: "खाता",

    // Page titles
    dashboardTitle: "डैशबोर्ड",
    myFieldsTitle: "मेरे खेत",
    diseaseDetectionTitle: "रोग पहचान",
    irrigationTitle: "सिंचाई सलाह",
    mandiPricesTitle: "मंडी भाव",
    weatherTitle: "मौसम पूर्वानुमान",
    govtSchemesTitle: "सरकारी योजनाएँ",
    carbonCreditTitle: "कार्बन क्रेडिट",
    ivrVoiceTitle: "IVR / आवाज़ सहायक",
    accountTitle: "खाता सेटिंग्स",

    // Misc
    loading: "लोड हो रहा है…",
    comingSoon: "जल्द आ रहा है",
    pageDescription: "यह अनुभाग विकास में है। जल्द ही वापस देखें!",
    welcomeBack: "स्वागत है",
    noNotifications: "कोई नई सूचना नहीं",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["en"];
