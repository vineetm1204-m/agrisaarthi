"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("Local Error Boundary caught:", error);
    }
  }, [error]);

  return (
    <div className="h-full min-h-[400px] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-500 mb-6 text-sm">
          We couldn't load this section of the application.
        </p>

        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 py-2.5 px-6 rounded-xl font-medium transition-colors"
        >
          <RefreshCcw className="w-4 h-4" />
          Retry
        </button>
      </div>
    </div>
  );
}
