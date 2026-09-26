"use client";

import { useEffect, useRef } from "react";

const PREFIX = "tap-audit-draft:";

// Lightweight localStorage-backed auto-draft, mirroring design-3.html's
// original offline-resilience behavior: save periodically + instantly on
// the browser's offline event, so an in-progress audit survives a reload
// or a dropped connection. Restoring on mount is the caller's job (see
// loadDraft) since it needs to merge with server-provided initial state.
export function useAutoSaveDraft<T>(key: string, state: T) {
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    function persist() {
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify({ state: stateRef.current, savedAt: Date.now() }));
      } catch {
        // storage unavailable (private mode, quota) — form still works in-memory
      }
    }

    const interval = setInterval(persist, 5000);
    window.addEventListener("offline", persist);
    window.addEventListener("beforeunload", persist);
    document.addEventListener("visibilitychange", persist);

    return () => {
      clearInterval(interval);
      window.removeEventListener("offline", persist);
      window.removeEventListener("beforeunload", persist);
      document.removeEventListener("visibilitychange", persist);
    };
  }, [key]);

  function clearDraft() {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      // ignore
    }
  }

  return { clearDraft };
}

export function loadDraft<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state: T; savedAt: number };
    return parsed.state;
  } catch {
    return null;
  }
}
