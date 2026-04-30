// ──────────────────────────────────────────────
// AgriSaarthi – Dashboard-specific translations
// ──────────────────────────────────────────────

export const dashboardTranslations = {
  en: {
    // Irrigation
    smartIrrigation: "Smart Irrigation",
    active: "Active",
    selectField: "Select Field",
    avgSoilMoisture: "Average Soil Moisture",
    waterSavedThisWeek: "Water Saved This Week",
    liters: "liters",
    upcomingIrrigation: "Upcoming Irrigation",
    nextScheduled: "Next Scheduled",
    zone: "Zone",
    overrideBtn: "Override",
    overrideSuccess: "Irrigation override activated!",
    overrideFail: "Override failed. Try again.",
    soilMoistureMap: "Soil Moisture Map",
    dry: "Dry",
    wet: "Wet",

    // Weather
    weatherForecast: "7-Day Weather Forecast",
    realtimeWeather: "Real-time Weather Data",
    temperature: "Temperature",
    humidity: "Humidity",
    rain: "Rain",

    // Crop Calendar
    cropCalendar: "Crop Calendar",
    tasksThisWeek: "Tasks This Week",
    noTasks: "No tasks due this week",
    today: "Today",
    upcoming: "Upcoming",
    overdue: "Overdue",

    // Mandi
    mandiPrices: "Mandi Prices",
    todaysPrice: "Today's Price",
    perQuintal: "per quintal",
    viewAllMandis: "View All Mandis →",
    priceUp: "up",
    priceDown: "down",

    // Alerts
    diseaseAlerts: "Disease & Pest Alerts",
    noAlerts: "No active alerts in your region",
    urgent: "Urgent",
    watch: "Watch",
    info: "Info",

    // Schemes
    govtSchemes: "Government Schemes",
    eligibleSchemes: "eligible schemes for you",
    checkEligibility: "Check Eligibility →",

    // General
    refreshing: "Refreshing data...",
    errorFetching: "Failed to load data",
    lastUpdated: "Last updated",
    minutesAgo: "minutes ago",
  },

  hi: {
    // Irrigation
    smartIrrigation: "स्मार्ट सिंचाई",
    active: "सक्रिय",
    selectField: "खेत चुनें",
    avgSoilMoisture: "औसत मिट्टी नमी",
    waterSavedThisWeek: "इस सप्ताह बचाया पानी",
    liters: "लीटर",
    upcomingIrrigation: "आगामी सिंचाई",
    nextScheduled: "अगला समय",
    zone: "ज़ोन",
    overrideBtn: "ओवरराइड",
    overrideSuccess: "सिंचाई ओवरराइड सक्रिय!",
    overrideFail: "ओवरराइड विफल। पुनः प्रयास करें।",
    soilMoistureMap: "मिट्टी नमी मैप",
    dry: "सूखा",
    wet: "गीला",

    // Weather
    weatherForecast: "7-दिन का मौसम पूर्वानुमान",
    realtimeWeather: "रियल-टाइम मौसम डेटा",
    temperature: "तापमान",
    humidity: "नमी",
    rain: "बारिश",

    // Crop Calendar
    cropCalendar: "फसल कैलेंडर",
    tasksThisWeek: "इस सप्ताह के कार्य",
    noTasks: "इस सप्ताह कोई कार्य नहीं",
    today: "आज",
    upcoming: "आगामी",
    overdue: "देर हो गई",

    // Mandi
    mandiPrices: "मंडी भाव",
    todaysPrice: "आज का भाव",
    perQuintal: "प्रति क्विंटल",
    viewAllMandis: "सभी मंडियाँ देखें →",
    priceUp: "ऊपर",
    priceDown: "नीचे",

    // Alerts
    diseaseAlerts: "रोग एवं कीट चेतावनी",
    noAlerts: "आपके क्षेत्र में कोई सक्रिय चेतावनी नहीं",
    urgent: "तत्काल",
    watch: "निगरानी",
    info: "जानकारी",

    // Schemes
    govtSchemes: "सरकारी योजनाएँ",
    eligibleSchemes: "योजनाएँ आपके लिए उपलब्ध",
    checkEligibility: "पात्रता जाँचें →",

    // General
    refreshing: "डेटा रिफ्रेश हो रहा है...",
    errorFetching: "डेटा लोड करने में विफल",
    lastUpdated: "अंतिम अपडेट",
    minutesAgo: "मिनट पहले",
  },
} as const;

export type DashboardTranslationKey = keyof (typeof dashboardTranslations)["en"];
