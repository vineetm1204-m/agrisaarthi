"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Headphones,
  Mic,
  MicOff,
  PhoneCall,
  Power,
} from "lucide-react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { apiFetch } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { formatDate, formatTime } from "@/lib/utils";
import type { IvrCallLog } from "@/lib/types";

const IVR_NUMBER = process.env.NEXT_PUBLIC_IVR_NUMBER ?? "";
const PAGE_SIZE = 10;

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    SpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

const QUERY_LABELS: Record<string, { en: string; hi: string }> = {
  disease: { en: "Disease", hi: "रोग" },
  weather: { en: "Weather", hi: "मौसम" },
  mandi: { en: "Mandi", hi: "मंडी" },
  schemes: { en: "Schemes", hi: "योजना" },
  general: { en: "General", hi: "सामान्य" },
  web_voice: { en: "Web Voice", hi: "वेब वॉइस" },
};

const STAT_COLORS = [
  "#0f766e",
  "#f59e0b",
  "#1d4ed8",
  "#16a34a",
  "#db2777",
  "#334155",
];

export default function IvrVoicePage() {
  const { farmer, language } = useAppStore();
  const [ivrEnabled, setIvrEnabled] = useState(true);
  const [ivrNumber, setIvrNumber] = useState(IVR_NUMBER);
  const [history, setHistory] = useState<IvrCallLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [queryText, setQueryText] = useState("");
  const [responseText, setResponseText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const isHindi = language === "hi";
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const statsData = useMemo(
    () =>
      Object.keys(QUERY_LABELS).map((key) => ({
        key,
        name: isHindi ? QUERY_LABELS[key].hi : QUERY_LABELS[key].en,
        value: stats[key] ?? 0,
      })),
    [stats, isHindi]
  );

  const statsTotal = statsData.reduce((sum, item) => sum + item.value, 0);

  useEffect(() => {
    const farmerId = farmer?.id;
    if (!farmerId) {
      return;
    }

    async function loadSettings() {
      try {
        const res = await apiFetch(`/api/ivr/settings?farmerId=${farmerId}`);
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        setIvrEnabled(Boolean(data.enabled));
        setIvrNumber(data.number || IVR_NUMBER);
      } catch (err) {
        console.warn("Unable to load IVR settings:", err);
      }
    }

    loadSettings();
  }, [farmer?.id]);

  useEffect(() => {
    const farmerId = farmer?.id;
    if (!farmerId) {
      return;
    }

    async function loadHistory() {
      setHistoryLoading(true);
      setHistoryError(null);

      try {
        const res = await apiFetch(
          `/api/ivr/history/${farmerId}?page=${page}&pageSize=${PAGE_SIZE}`
        );
        if (!res.ok) {
          throw new Error("Failed to fetch history");
        }

        const data = await res.json();
        setHistory(data.items || []);
        setTotalCount(data.totalCount || 0);
        setStats(data.stats || {});
      } catch (err: any) {
        setHistoryError(err.message || "Unable to load history.");
      } finally {
        setHistoryLoading(false);
      }
    }

    loadHistory();
  }, [farmer?.id, page, historyRefresh]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const synth = window.speechSynthesis;
    const loadVoices = () => {
      setVoices(synth.getVoices());
    };

    loadVoices();
    synth.onvoiceschanged = loadVoices;

    return () => {
      synth.onvoiceschanged = null;
    };
  }, []);

  const handleToggle = async () => {
    const farmerId = farmer?.id;
    if (!farmerId) {
      return;
    }

    const nextValue = !ivrEnabled;
    setIvrEnabled(nextValue);

    try {
      const res = await apiFetch("/api/ivr/settings", {
        method: "POST",
        body: JSON.stringify({
          farmerId,
          enabled: nextValue,
          number: ivrNumber || IVR_NUMBER,
        }),
      });

      if (!res.ok) {
        throw new Error("Settings update failed");
      }
    } catch (err) {
      console.warn("IVR settings update failed:", err);
      setIvrEnabled(!nextValue);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const truncate = (text: string, max = 80) =>
    text.length > max ? `${text.slice(0, max)}...` : text;

  const speakResponse = (text: string) => {
    if (typeof window === "undefined" || !text) {
      return;
    }

    const synth = window.speechSynthesis;
    const lang = isHindi ? "hi-IN" : "en-IN";
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    const preferred =
      voices.find(
        (voice) =>
          voice.lang === lang && /female|woman|mahila|lady/i.test(voice.name)
      ) || voices.find((voice) => voice.lang === lang);

    if (preferred) {
      utterance.voice = preferred;
    }

    synth.cancel();
    synth.speak(utterance);
  };

  const sendVoiceQuery = async (text: string) => {
    const farmerId = farmer?.id;
    if (!text.trim() || !farmerId) {
      return;
    }

    setIsThinking(true);
    setVoiceError(null);

    try {
      const res = await apiFetch("/api/chat/query", {
        method: "POST",
        body: JSON.stringify({
          text,
          farmerId,
        }),
      });

      if (!res.ok) {
        throw new Error("Query failed");
      }

      const data = await res.json();
      const reply = data.responseText || "";
      setResponseText(reply);
      speakResponse(reply);
      setPage(1);
      setHistoryRefresh((prev) => prev + 1);
    } catch (err: any) {
      setVoiceError(err.message || "Voice query failed.");
    } finally {
      setIsThinking(false);
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const startListening = () => {
    if (typeof window === "undefined") {
      return;
    }

    setVoiceError(null);

    const RecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!RecognitionCtor) {
      setVoiceError(
        isHindi
          ? "आपका ब्राउज़र वॉइस रिकग्निशन सपोर्ट नहीं करता।"
          : "Your browser does not support voice recognition."
      );
      return;
    }

    const recognition = new RecognitionCtor();
    recognition.lang = isHindi ? "hi-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setQueryText(transcript);
      sendVoiceQuery(transcript);
    };

    recognition.onerror = () => {
      setVoiceError(
        isHindi
          ? "वॉइस रिकग्निशन में समस्या आई।"
          : "Voice recognition failed."
      );
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  if (!farmer) {
    return (
      <div className="dash-page ivr-voice-page">
        <div className="dash-card">Loading IVR data...</div>
      </div>
    );
  }

  return (
    <div className="dash-page ivr-voice-page">
      <div className="ivr-hero">
        <div className="ivr-hero-content">
          <span className="ivr-hero-badge">
            {isHindi ? "IVR कमांड सेंटर" : "IVR Command Center"}
          </span>
          <h1>{isHindi ? "IVR / आवाज़" : "IVR / Voice"}</h1>
          <p>
            {isHindi
              ? "अपनी IVR लाइन, कॉल हिस्ट्री और वॉइस इंसाइट्स को एक जगह से कंट्रोल करें।"
              : "Control your IVR line, call history, and voice insights from one place."}
          </p>
        </div>

        <div className="ivr-hero-card">
          <div>
            <div className="ivr-hero-label">
              {isHindi ? "आपका IVR नंबर" : "Your IVR Number"}
            </div>
            <div className="ivr-hero-number">
              {ivrNumber || IVR_NUMBER || "-"}
            </div>
          </div>
          <a className="btn-primary" href={`tel:${ivrNumber || IVR_NUMBER}`}>
            <PhoneCall size={18} /> {isHindi ? "अभी कॉल करें" : "Call Now"}
          </a>
        </div>
      </div>

      <div className="ivr-grid-top">
        <section className="dash-card ivr-card">
          <div className="ivr-card-header">
            <div>
              <h2>{isHindi ? "IVR स्टेटस" : "IVR Status"}</h2>
              <p>
                {isHindi
                  ? "IVR एक्सेस को चालू या बंद करें।"
                  : "Enable or disable IVR access for this farmer."}
              </p>
            </div>
            <Power className="ivr-card-icon" size={22} />
          </div>

          <div className="ivr-status-row">
            <div>
              <span className="ivr-status-label">
                {isHindi ? "स्थिति" : "Status"}
              </span>
              <div className="ivr-status-value">
                {ivrEnabled
                  ? isHindi
                    ? "सक्रिय"
                    : "Active"
                  : isHindi
                  ? "बंद"
                  : "Disabled"}
              </div>
            </div>

            <button
              className="ivr-toggle"
              onClick={handleToggle}
              role="switch"
              aria-checked={ivrEnabled}
              data-enabled={ivrEnabled}
            />
          </div>

          <div className="ivr-status-footnote">
            {isHindi
              ? "IVR बंद होने पर किसान IVR लाइन पर नहीं जुड़ पाएंगे।"
              : "When IVR is disabled, calls will not connect to the IVR flow."}
          </div>
        </section>

        <section className="dash-card ivr-card">
          <div className="ivr-card-header">
            <div>
              <h2>{isHindi ? "वॉइस क्वेरी आंकड़े" : "Voice Query Stats"}</h2>
              <p>
                {isHindi
                  ? "इस महीने की कॉल का ब्रेकडाउन।"
                  : "Breakdown of calls for the current month."}
              </p>
            </div>
            <BarChart3 className="ivr-card-icon" size={22} />
          </div>

          {statsTotal === 0 ? (
            <div className="ivr-empty-state">
              {isHindi
                ? "इस महीने कोई रिकॉर्ड नहीं है।"
                : "No records for this month yet."}
            </div>
          ) : (
            <div className="ivr-chart">
              <ResponsiveContainer width="100%" height={220}>
                <RechartsPieChart>
                  <Pie
                    data={statsData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={90}
                    paddingAngle={4}
                  >
                    {statsData.map((entry, index) => (
                      <Cell
                        key={entry.key}
                        fill={STAT_COLORS[index % STAT_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "none",
                      boxShadow: "0 12px 24px rgba(15, 23, 42, 0.18)",
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    layout="horizontal"
                    align="center"
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <section className="dash-card ivr-card ivr-history-card">
        <div className="ivr-card-header">
          <div>
            <h2>{isHindi ? "कॉल हिस्ट्री" : "Call History"}</h2>
            <p>
              {isHindi
                ? "हर IVR या वॉइस क्वेरी का रिकॉर्ड देखें।"
                : "Track every IVR and in-app voice query."}
            </p>
          </div>
          <Headphones className="ivr-card-icon" size={22} />
        </div>

        {historyLoading ? (
          <div className="ivr-empty-state">Loading history...</div>
        ) : historyError ? (
          <div className="ivr-empty-state ivr-error">{historyError}</div>
        ) : history.length === 0 ? (
          <div className="ivr-empty-state">
            {isHindi ? "कोई कॉल रिकॉर्ड नहीं मिला।" : "No call records yet."}
          </div>
        ) : (
          <div className="ivr-history-table">
            <div className="ivr-history-header">
              <span>{isHindi ? "तारीख" : "Date"}</span>
              <span>{isHindi ? "समय" : "Time"}</span>
              <span>{isHindi ? "टाइप" : "Type"}</span>
              <span>{isHindi ? "क्वेरी" : "Query"}</span>
              <span>{isHindi ? "उत्तर सारांश" : "Response"}</span>
              <span>{isHindi ? "समय (सेकंड)" : "Duration"}</span>
              <span />
            </div>
            {history.map((item) => {
              const label = QUERY_LABELS[item.queryType] || QUERY_LABELS.general;
              const expanded = expandedId === item.id;
              return (
                <div key={item.id} className="ivr-history-row">
                  <button
                    className="ivr-history-main"
                    onClick={() => toggleExpanded(item.id)}
                  >
                    <span>{formatDate(item.timestamp)}</span>
                    <span>{formatTime(item.timestamp)}</span>
                    <span className="ivr-pill">
                      {isHindi ? label.hi : label.en}
                    </span>
                    <span>{truncate(item.queryText)}</span>
                    <span>{truncate(item.responseText)}</span>
                    <span className="ivr-duration">
                      {item.durationSeconds ?? "-"}
                    </span>
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {expanded && (
                    <div className="ivr-history-detail">
                      <div>
                        <strong>{isHindi ? "पूरी क्वेरी" : "Full Query"}</strong>
                        <p>{item.queryText}</p>
                      </div>
                      <div>
                        <strong>{isHindi ? "पूरा उत्तर" : "Full Response"}</strong>
                        <p>{item.responseText}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="ivr-pagination">
          <button
            className="btn-secondary"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
          >
            {isHindi ? "पिछला" : "Previous"}
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            className="btn-secondary"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
          >
            {isHindi ? "अगला" : "Next"}
          </button>
        </div>
      </section>

      <section className="dash-card ivr-card ivr-voice-card">
        <div className="ivr-card-header">
          <div>
            <h2>{isHindi ? "इन-ऐप वॉइस चैट" : "In-App Voice Chat"}</h2>
            <p>
              {isHindi
                ? "बटन दबाकर अपना सवाल बोलें और उत्तर सुनें।"
                : "Speak your query and hear the response instantly."}
            </p>
          </div>
          <Mic className="ivr-card-icon" size={22} />
        </div>

        <div className="ivr-voice-grid">
          <div className="ivr-voice-panel">
            <button
              className={`ivr-voice-button${isListening ? " active" : ""}`}
              onClick={isListening ? stopListening : startListening}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              {isListening
                ? isHindi
                  ? "सुन रहा है... रोकें"
                  : "Listening... Stop"
                : isHindi
                ? "अपना सवाल बोलें"
                : "Speak Your Query"}
            </button>
            <p className="ivr-voice-note">
              {isHindi
                ? "हिंदी या इंग्लिश में बोलें।"
                : "Speak in Hindi or English."}
            </p>
          </div>

          <div className="ivr-voice-panel ivr-voice-text">
            <label>{isHindi ? "आपका सवाल" : "Your Query"}</label>
            <textarea
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              placeholder={
                isHindi
                  ? "यहां अपना सवाल टाइप करें..."
                  : "Type your question here..."
              }
            />
            <button
              className="btn-secondary"
              onClick={() => sendVoiceQuery(queryText)}
              disabled={isThinking}
            >
              {isThinking
                ? isHindi
                  ? "सोच रहा है..."
                  : "Thinking..."
                : isHindi
                ? "उत्तर पाएँ"
                : "Get Response"}
            </button>
          </div>
        </div>

        {voiceError && <div className="ivr-empty-state ivr-error">{voiceError}</div>}

        <div className="ivr-response">
          <div className="ivr-response-title">
            {isHindi ? "उत्तर" : "Response"}
          </div>
          <p>{responseText || (isHindi ? "उत्तर यहां आएगा।" : "Response will appear here.")}</p>
        </div>
      </section>
    </div>
  );
}
