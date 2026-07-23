"use client";

import { useEffect } from "react";

// Error boundary for the dashboard segment. In Next.js 16 the retry callback is
// `unstable_retry` (the older `reset` prop was renamed); it re-renders the
// segment, re-running the server components and their data fetches.
export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] render error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 px-6 text-center">
      <h2 className="text-xl font-semibold text-red-400">Something went wrong</h2>
      <p className="max-w-md text-sm text-zinc-400">
        {error.message || "The page could not be loaded. Please try again."}
      </p>
      <button
        onClick={() => unstable_retry()}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
