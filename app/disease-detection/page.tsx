"use client";

import { useEffect, useState, useRef } from "react";
import { UploadCloud, Camera, XCircle, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { useAppStore } from "@/lib/store";
import { apiFetch } from "@/lib/api";

type Prediction = {
  className: string;
  probability: number;
};

type HistoryItem = {
  id: string;
  imageSrc: string;
  predictions: Prediction[];
  date: string;
};

export default function DiseaseDetectionPage() {

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[] | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const { fields } = useAppStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Removed TFJS model loading since we are using the external API
  const [loadingModel, setLoadingModel] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  // Load Model and Labels
  useEffect(() => {
    // Load history if fields exist
    if (fields && fields.length > 0) {
      const fieldId = fields[0].id;
      apiFetch(`/api/disease/history/${fieldId}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const mappedHistory = data.map((d: any) => ({
              id: d.id,
              imageSrc: d.imageUrl || "/placeholder.png",
              predictions: [{ className: d.diseaseName, probability: d.confidence || 0 }],
              date: d.date || new Date().toISOString().split("T")[0],
            }));
            setHistory(mappedHistory);
          }
        })
        .catch(console.error);
    }

    return () => {
      stopCamera();
    };
  }, [fields]);

  // Camera Management
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.error("Error playing video:", e));
    }
  }, [isCameraActive]);

  const startCamera = async () => {
    setImageSrc(null);
    setPredictions(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setIsCameraActive(true); // Triggers re-render, then useEffect attaches stream
    } catch (err) {
      toast.error("Camera access denied or unavailable.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const captureImage = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = 224; // Match the API requirement
    canvas.height = 224;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    setImageSrc(dataUrl);
    stopCamera();
    runPrediction(dataUrl);
  };

  // Upload Management
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImageSrc(result);
      stopCamera();
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 224;
        canvas.height = 224;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, 224, 224);
          runPrediction(canvas.toDataURL("image/png"));
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (fileInputRef.current) {
      // Manual trigger of handleFileUpload logic for drop
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload a valid image file.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImageSrc(result);
        stopCamera();
        
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 224;
          canvas.height = 224;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, 224, 224);
            runPrediction(canvas.toDataURL("image/png"));
          }
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  };

  // Prediction Pipeline via External API Proxy
  const runPrediction = async (base64Image: string) => {
    setIsPredicting(true);
    try {
      const payload = {
        imageBase64: base64Image,
        fieldId: fields && fields.length > 0 ? fields[0].id : undefined,
      };

      const res = await fetch("/api/disease/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to get prediction from API");

      const data = await res.json();
      
      // Map API response to our prediction structure
      const preds: Prediction[] = [
        { className: data.disease || "Unknown", probability: data.confidence || 0 }
      ];

      setPredictions(preds);

      // Add to history
      setHistory((prev) => [
        { 
          id: Date.now().toString(), 
          imageSrc: base64Image, 
          predictions: preds, 
          date: new Date().toLocaleString() 
        },
        ...prev,
      ]);

    } catch (err) {
      console.error(err);
      toast.error("Prediction failed. The server might be down.");
    } finally {
      setIsPredicting(false);
    }
  };

  const reset = () => {
    setImageSrc(null);
    setPredictions(null);
    stopCamera();
  };

  const topPred = predictions?.[0];
  const isHealthy = topPred?.className?.toLowerCase().includes("healthy") ?? false;

  return (
    <div className="dash-page animate-fade-in-up">
      <div className="page-header">
        <h1>Disease Detection</h1>
        <p>Upload a photo or use your camera to identify crop diseases instantly.</p>
      </div>

      {loadingModel && (
        <div className="dash-card text-center py-10">
          <div className="loading-spinner"></div>
          <p className="mt-4 text-muted">Loading AI Model...</p>
        </div>
      )}

      {modelError && (
        <div className="dash-card alert-card error">
          <AlertTriangle className="dash-icon-red" />
          <p>{modelError}</p>
        </div>
      )}

      {!loadingModel && !modelError && (
        <div className="disease-layout">
          {/* Left Panel: Input */}
          <div className="dash-card disease-left">
            <h2 className="tab-section-title">Image Input</h2>

            {isCameraActive ? (
              <div className="camera-container">
                <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
                <div className="camera-controls">
                  <button className="btn-primary" onClick={captureImage}>Capture & Predict</button>
                  <button className="btn-secondary" onClick={stopCamera}>Cancel</button>
                </div>
              </div>
            ) : imageSrc ? (
              <div className="preview-container">
                <img src={imageSrc} alt="Crop preview" className="preview-image" />
                <button className="btn-secondary mt-4 w-full" onClick={reset}>Try Another Image</button>
              </div>
            ) : (
              <div className="input-options">
                <div
                  className="upload-dropzone"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud size={48} color="var(--color-primary)" />
                  <h3>Upload Image</h3>
                  <p>Drag & drop or click to select</p>
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                </div>

                <div className="divider text-muted text-sm text-center my-4">OR</div>

                <button className="btn-secondary w-full" onClick={startCamera}>
                  <Camera size={18} className="mr-2 inline" /> Use Live Camera
                </button>
              </div>
            )}
          </div>

          {/* Right Panel: Results */}
          <div className="dash-card disease-right">
            <h2 className="tab-section-title">Analysis Results</h2>

            {isPredicting ? (
              <div className="text-center py-12">
                <div className="loading-spinner mx-auto mb-4"></div>
                <p className="text-muted">Analyzing image...</p>
              </div>
            ) : predictions ? (
              <div className="results-container animate-fade-in-up">
                <div className={`main-result-card ${isHealthy ? 'healthy' : 'diseased'}`}>
                  <div className="result-header">
                    {isHealthy ? <CheckCircle size={32} color="#16a34a" /> : <AlertTriangle size={32} color="#dc2626" />}
                    <h3>{topPred?.className}</h3>
                  </div>
                  <div className="confidence-large">{topPred?.probability.toFixed(1)}% Confidence</div>
                  <span className={`status-badge ${isHealthy ? 'badge-healthy' : 'badge-diseased'}`}>
                    {isHealthy ? "Crop is Healthy" : "Disease Detected"}
                  </span>
                </div>

                <h4 className="mt-6 mb-2 font-bold text-sm text-muted">Alternative Predictions</h4>
                <div className="alt-predictions">
                  {predictions.slice(1).map((pred, i) => (
                    <div key={i} className="alt-pred-row">
                      <span>{pred.className}</span>
                      <strong>{pred.probability.toFixed(1)}%</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-results text-center py-12 text-muted">
                <Camera size={48} className="mx-auto mb-4 opacity-50" />
                <p>Provide an image to see detection results.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Section */}
      {history.length > 0 && (
        <div className="dash-card mt-6 animate-fade-in-up">
          <h2 className="tab-section-title">Prediction History</h2>
          <div className="history-grid">
            {history.map((item) => {
              const histTop = item.predictions[0];
              const histHealthy = histTop?.className?.toLowerCase().includes("healthy") ?? false;
              return (
                <div key={item.id} className="history-card">
                  <img src={item.imageSrc} alt="History" className="history-img" />
                  <div className="history-info">
                    <strong>{histTop.className}</strong>
                    <span>{histTop.probability.toFixed(1)}%</span>
                    <span className="history-date">{item.date}</span>
                    <div className={`history-badge ${histHealthy ? 'text-green' : 'text-red'}`}>
                      {histHealthy ? "Healthy" : "Diseased"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
