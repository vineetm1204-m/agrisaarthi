"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { apiFetch, getAuthToken, setAuthToken } from "@/lib/api";
import { INDIA_STATES, DISTRICTS_BY_STATE } from "@/lib/indiaLocations";
import { CROPS } from "@/lib/crops";

type LanguagePreference = "hi" | "en" | "mr";

type SoilType = "black-cotton" | "loamy" | "sandy" | "clay";

type OnboardingData = {
  fullName: string;
  state: string;
  district: string;
  languagePreference: LanguagePreference;
  fieldName: string;
  areaAcres: string;
  soilType: SoilType;
  crop: string;
  sowingDate: string;
  location: { lat: number | null; lng: number | null };
  ivrEnabled: boolean;
};

const STEPS = [
  "Personal Info",
  "First Field",
  "Access Method",
  "Summary",
] as const;

const SOIL_TYPES: Array<{ value: SoilType; label: string; helper: string }> = [
  { value: "black-cotton", label: "Black Cotton", helper: "Rich, moisture-holding" },
  { value: "loamy", label: "Loamy", helper: "Balanced and fertile" },
  { value: "sandy", label: "Sandy", helper: "Quick draining" },
  { value: "clay", label: "Clay", helper: "Heavy, nutrient dense" },
];

const IVR_NUMBER = process.env.NEXT_PUBLIC_IVR_NUMBER ?? "+1 9387863936";
const FARMER_COLLECTION = "farmers";

export default function OnboardingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    fullName: "",
    state: "",
    district: "",
    languagePreference: "hi",
    fieldName: "",
    areaAcres: "",
    soilType: "loamy",
    crop: "",
    sowingDate: "",
    location: { lat: null, lng: null },
    ivrEnabled: true,
  });

  const districts = useMemo(() => {
    return data.state ? DISTRICTS_BY_STATE[data.state] ?? [] : [];
  }, [data.state]);

  const soilLabel = useMemo(() => {
    return (
      SOIL_TYPES.find((soil) => soil.value === data.soilType)?.label ??
      data.soilType
    );
  }, [data.soilType]);

  const languageLabel = useMemo(() => {
    const labels: Record<LanguagePreference, string> = {
      hi: "Hindi",
      en: "English",
      mr: "Marathi",
    };

    return labels[data.languagePreference];
  }, [data.languagePreference]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      setCurrentUser(user);
      if (!getAuthToken()) {
        const token = await user.getIdToken();
        setAuthToken(token);
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!data.state) {
      return;
    }

    if (data.district && !districts.includes(data.district)) {
      setData((prev) => ({ ...prev, district: "" }));
    }
  }, [data.state, data.district, districts]);

  const updateData = (patch: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  };

  const canProceed = useMemo(() => {
    if (step === 1) {
      return Boolean(data.fullName && data.state && data.district);
    }

    if (step === 2) {
      return (
        Boolean(data.fieldName) &&
        Boolean(data.areaAcres) &&
        Number(data.areaAcres) > 0 &&
        Boolean(data.crop) &&
        Boolean(data.sowingDate)
      );
    }

    return true;
  }, [data, step]);

  const progress = Math.round((step / STEPS.length) * 100);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return;
    }

    setError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setData((prev) => ({
          ...prev,
          location: {
            lat: Number(position.coords.latitude.toFixed(6)),
            lng: Number(position.coords.longitude.toFixed(6)),
          },
        }));
        setLocating(false);
      },
      () => {
        setError("Unable to fetch GPS location. Try again.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleComplete = async () => {
    if (!currentUser) {
      setError("You are not signed in. Please log in again.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const farmerPayload = {
      name: data.fullName,
      phone: currentUser.phoneNumber ?? undefined,
      state: data.state,
      district: data.district,
      languagePref: data.languagePreference,
      primaryCrop: data.crop,
      landSizeAcres: Number(data.areaAcres),
    };

    const fieldPayload = {
      name: data.fieldName,
      areaAcres: Number(data.areaAcres),
      soilType: data.soilType,
      currentCrop: data.crop,
      sowingDate: data.sowingDate,
      lat: data.location.lat ?? undefined,
      lng: data.location.lng ?? undefined,
    };

    try {
      // 1. Create Farmer
      const farmerRes = await apiFetch("/api/farmer", {
        method: "POST",
        body: JSON.stringify(farmerPayload),
      });

      if (!farmerRes.ok) {
        const message = await farmerRes.text();
        throw new Error(message || "Registration failed");
      }

      // 2. Create Field
      const fieldRes = await apiFetch("/api/fields", {
        method: "POST",
        body: JSON.stringify(fieldPayload),
      });

      if (!fieldRes.ok) {
        console.warn("Field creation failed, but farmer was created.");
      }

      await setDoc(
        doc(db, FARMER_COLLECTION, currentUser.uid),
        {
          fullName: data.fullName,
          phoneNumber: currentUser.phoneNumber ?? null,
          state: data.state,
          district: data.district,
          languagePreference: data.languagePreference,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      router.replace("/dashboard");
    } catch (err) {
      console.error("Onboarding submission failed:", err);
      setError("Unable to complete setup. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="onboarding-shell">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <div>
            <p className="onboarding-eyebrow">Onboarding</p>
            <h1>Set up your AgriSaarthi profile</h1>
            <p className="onboarding-subtitle">
              Step {step} of {STEPS.length} · {STEPS[step - 1]}
            </p>
          </div>
          <div className="onboarding-progress">
            <div className="onboarding-progress-bar">
              <span style={{ width: `${progress}%` }} />
            </div>
            <span className="onboarding-progress-text">{progress}%</span>
          </div>
        </div>

        {step === 1 && (
          <div className="onboarding-step">
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="fullName">Full name</label>
                <input
                  id="fullName"
                  className="form-input"
                  value={data.fullName}
                  onChange={(event) =>
                    updateData({ fullName: event.target.value })
                  }
                  placeholder="e.g., Ramesh Kumar"
                />
              </div>
              <div className="form-field">
                <label htmlFor="state">State</label>
                <select
                  id="state"
                  className="form-input"
                  value={data.state}
                  onChange={(event) =>
                    updateData({ state: event.target.value })
                  }
                >
                  <option value="">Select state</option>
                  {INDIA_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="district">District</label>
                <input
                  id="district"
                  list="district-options"
                  className="form-input"
                  value={data.district}
                  onChange={(event) =>
                    updateData({ district: event.target.value })
                  }
                  placeholder={data.state ? "Select district" : "Pick a state first"}
                  disabled={!data.state}
                />
                <datalist id="district-options">
                  {districts.map((district) => (
                    <option key={district} value={district} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="form-field">
              <label>Language preference</label>
              <div className="toggle-group">
                {([
                  { value: "hi", label: "Hindi" },
                  { value: "en", label: "English" },
                  { value: "mr", label: "Marathi" },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`toggle-btn${
                      data.languagePreference === option.value ? " active" : ""
                    }`}
                    onClick={() =>
                      updateData({ languagePreference: option.value })
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step">
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="fieldName">Field name</label>
                <input
                  id="fieldName"
                  className="form-input"
                  value={data.fieldName}
                  onChange={(event) =>
                    updateData({ fieldName: event.target.value })
                  }
                  placeholder="e.g., South Plot"
                />
              </div>
              <div className="form-field">
                <label htmlFor="areaAcres">Area (acres)</label>
                <input
                  id="areaAcres"
                  className="form-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.areaAcres}
                  onChange={(event) =>
                    updateData({ areaAcres: event.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-field">
              <label>Soil type</label>
              <div className="soil-grid">
                {SOIL_TYPES.map((soil) => (
                  <label
                    key={soil.value}
                    className={`soil-card${
                      data.soilType === soil.value ? " selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="soilType"
                      value={soil.value}
                      checked={data.soilType === soil.value}
                      onChange={() => updateData({ soilType: soil.value })}
                    />
                    <div>
                      <h4>{soil.label}</h4>
                      <p>{soil.helper}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="crop">Current crop</label>
                <input
                  id="crop"
                  list="crop-options"
                  className="form-input"
                  value={data.crop}
                  onChange={(event) => updateData({ crop: event.target.value })}
                  placeholder="Search crops"
                />
                <datalist id="crop-options">
                  {CROPS.map((crop) => (
                    <option key={crop} value={crop} />
                  ))}
                </datalist>
              </div>
              <div className="form-field">
                <label htmlFor="sowingDate">Sowing date</label>
                <input
                  id="sowingDate"
                  className="form-input"
                  type="date"
                  value={data.sowingDate}
                  onChange={(event) =>
                    updateData({ sowingDate: event.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-field">
              <label>GPS location</label>
              <div className="gps-row">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleDetectLocation}
                  disabled={locating}
                >
                  {locating ? "Detecting..." : "Use current location"}
                </button>
                <div className="gps-coords">
                  {data.location.lat && data.location.lng
                    ? `${data.location.lat}, ${data.location.lng}`
                    : "No GPS stored"}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-step">
            <div className="form-field">
              <label>Enable IVR calling?</label>
              <div className="toggle-group">
                <button
                  type="button"
                  className={`toggle-btn${data.ivrEnabled ? " active" : ""}`}
                  onClick={() => updateData({ ivrEnabled: true })}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={`toggle-btn${!data.ivrEnabled ? " active" : ""}`}
                  onClick={() => updateData({ ivrEnabled: false })}
                >
                  No
                </button>
              </div>
            </div>

            {data.ivrEnabled && (
              <div className="ivr-card">
                <h3>Your IVR number</h3>
                <p className="ivr-number">{IVR_NUMBER}</p>
                <p className="ivr-note">
                  Save this number. You will receive advisory calls and can call
                  back for guided support.
                </p>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="onboarding-step">
            <div className="summary-card">
              <div>
                <h3>Personal info</h3>
                <p>{data.fullName}</p>
                <p>
                  {data.district}, {data.state}
                </p>
                <p>Language: {languageLabel}</p>
              </div>
              <div>
                <h3>First field</h3>
                <p>{data.fieldName}</p>
                <p>
                  {data.areaAcres} acres · {soilLabel}
                </p>
                <p>Crop: {data.crop}</p>
                <p>Sowing: {data.sowingDate}</p>
                <p>
                  GPS: {data.location.lat ?? "-"}, {data.location.lng ?? "-"}
                </p>
              </div>
              <div>
                <h3>Access method</h3>
                <p>{data.ivrEnabled ? "IVR enabled" : "IVR disabled"}</p>
                {data.ivrEnabled && <p>IVR: {IVR_NUMBER}</p>}
              </div>
            </div>
          </div>
        )}

        {error && <div className="form-error">{error}</div>}

        <div className="onboarding-actions">
          {step > 1 ? (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setStep((prev) => prev - 1)}
              disabled={isSubmitting}
            >
              Back
            </button>
          ) : (
            <span />
          )}

          {step < STEPS.length ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setStep((prev) => prev + 1)}
              disabled={!canProceed || isSubmitting}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={handleComplete}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Complete Setup"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
