"use client";

import { useEffect, useRef } from "react";

const CSS_HEIGHT = 140;

export function SignatureField({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const hasDrawnRef = useRef(false);

  // Size the canvas's drawing buffer to its actual rendered width (so it
  // never overflows a narrow mobile viewport) and to devicePixelRatio (so
  // strokes stay crisp on high-DPI screens), then re-apply stroke settings
  // and redraw the existing signature (if any) — needed every time, since
  // resizing a canvas clears it and resets context. The canvas stays the
  // single editing surface for the whole session (never swapped for a
  // locked <img>) so lifting the pointer between strokes — e.g. writing
  // initials, dotting an "i" — doesn't end the signature.
  useEffect(() => {
    if (disabled) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    function resize() {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;
      const cssWidth = wrap.clientWidth;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = cssWidth * ratio;
      canvas.height = CSS_HEIGHT * ratio;
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${CSS_HEIGHT}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(ratio, ratio);
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#17161B";
        if (value) {
          const img = new Image();
          img.onload = () => ctx.drawImage(img, 0, 0, cssWidth, CSS_HEIGHT);
          img.src = value;
        }
      }
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    return () => observer.disconnect();
    // Deliberately re-run only on resize/mount, not on every `value` change —
    // pointerup already commits strokes onto this same canvas without a
    // remount, so re-drawing `value` here on every change would just repaint
    // an image over the live in-progress stroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const ctx = e.currentTarget.getContext("2d");
    const { x, y } = pointerPos(e);
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || disabled) return;
    const ctx = e.currentTarget.getContext("2d");
    const { x, y } = pointerPos(e);
    ctx?.lineTo(x, y);
    ctx?.stroke();
    hasDrawnRef.current = true;
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const canvas = canvasRef.current;
    // Commits the accumulated canvas (all strokes so far) as the response —
    // the canvas itself stays interactive, so the user can keep signing.
    if (canvas && hasDrawnRef.current) onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    hasDrawnRef.current = false;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      const ratio = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    }
    onChange(null);
  }

  if (disabled) {
    return value ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={value} alt="Signature" style={{ maxWidth: 360, background: "#fff", borderRadius: 14, border: "1px solid var(--rule)" }} />
    ) : (
      <p style={{ fontSize: 13, color: "var(--ink-2)" }}>Not signed</p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 360 }}>
      <div ref={wrapRef} style={{ width: "100%" }}>
        <canvas
          ref={canvasRef}
          style={{ display: "block", background: "#fff", borderRadius: 14, border: "1px solid var(--rule-2)", touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
      <button type="button" className="btn ghost sm" onClick={clear} style={{ alignSelf: "flex-start" }}>
        Clear
      </button>
    </div>
  );
}
