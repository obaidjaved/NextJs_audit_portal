"use client";

import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [status, setStatus] = useState<"online" | "offline" | null>(null);

  useEffect(() => {
    function goOffline() {
      setStatus("offline");
    }
    function goOnline() {
      setStatus("online");
      const t = setTimeout(() => setStatus(null), 3000);
      return () => clearTimeout(t);
    }
    // Sync initial connectivity from the browser (an external system) on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!navigator.onLine) setStatus("offline");
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!status) return null;

  return (
    <div className="offline-banner" data-status={status} style={{ borderRadius: 14, marginBottom: 16 }}>
      {status === "offline"
        ? "Offline — your work is being saved locally and will sync when you're back online."
        : "Back online — changes are syncing."}
    </div>
  );
}
