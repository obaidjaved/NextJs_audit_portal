"use client";

import { useRef, useState } from "react";
import { uploadFile } from "@/lib/upload";

export function PhotoField({
  value,
  caption,
  onChange,
  disabled,
}: {
  value: string | null;
  caption: string;
  onChange: (value: string | null, caption: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped on every new upload and on remove, so an in-flight upload can tell
  // it's been superseded (e.g. the photo was removed while it was still
  // uploading) and skip its onChange instead of resurrecting the photo.
  const uploadTokenRef = useRef(0);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const token = ++uploadTokenRef.current;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadFile(file);
      if (uploadTokenRef.current === token) onChange(url, caption);
    } catch (err) {
      if (uploadTokenRef.current === token) setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      if (uploadTokenRef.current === token) setUploading(false);
    }
  }

  function handleRemove() {
    uploadTokenRef.current++;
    onChange(null, caption);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 360 }}>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" style={{ maxWidth: "100%", borderRadius: 14, border: "1px solid var(--rule)" }} />
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        disabled={disabled || uploading}
        style={{ display: "none" }}
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="btn ghost sm"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading…" : value ? "Replace photo" : "Add photo"}
        </button>
        {value && !disabled ? (
          <button type="button" className="btn ghost sm" onClick={handleRemove}>
            Remove
          </button>
        ) : null}
      </div>

      {error && <p style={{ fontSize: 12, color: "var(--danger)", margin: 0 }}>{error}</p>}

      <input
        className="input"
        placeholder="Caption — explain what this photo shows"
        value={caption}
        disabled={disabled}
        onChange={(e) => onChange(value, e.target.value)}
      />
    </div>
  );
}
