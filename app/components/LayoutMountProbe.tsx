"use client";

import { useEffect } from "react";

// Renders nothing. Logs exactly once when the dashboard layout mounts.
// If you see this log more than once during navigation, the layout is remounting (should never happen in App Router).
export default function LayoutMountProbe() {
  useEffect(() => {
    console.log("[DashboardLayout] mounted — should appear only once per session");
  }, []);
  return null;
}
