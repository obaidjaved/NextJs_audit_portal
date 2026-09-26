"use client";

import { useEffect, useRef, useState } from "react";

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
}

export function LocationField({
  value,
  coords,
  onChange,
  disabled,
}: {
  value: string;
  coords: { lat: number; lng: number; accuracy: number } | null;
  onChange: (value: string, coords: { lat: number; lng: number; accuracy: number } | null) => void;
  disabled?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const seqRef = useRef(0);

  useEffect(() => {
    if (!value || value.length < 3) {
      seqRef.current += 1;
      return;
    }
    const seq = ++seqRef.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(value)}`,
        );
        const data: Suggestion[] = await res.json();
        if (seq === seqRef.current) {
          setSuggestions(data);
          setOpen(true);
        }
      } catch {
        // offline / network error — search silently unavailable
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [value]);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(value || "Current location", {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div style={{ position: "relative", maxWidth: 360 }}>
      <input
        className="input"
        placeholder="Search an address or place…"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value, null)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />

      {open && value.length >= 3 && suggestions.length > 0 && (
        <ul
          className="card"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            zIndex: 30,
            listStyle: "none",
            padding: 6,
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  onChange(s.display_name, { lat: Number(s.lat), lng: Number(s.lon), accuracy: 0 });
                  setOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: 10,
                  fontSize: 13,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {s.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
        <button type="button" className="btn ghost sm" disabled={disabled || locating} onClick={useMyLocation}>
          {locating ? "Locating…" : "Use my location"}
        </button>
        {coords && (
          <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-2)" }}>
            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </span>
        )}
      </div>
    </div>
  );
}
