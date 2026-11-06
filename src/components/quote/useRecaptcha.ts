"use client";

import { useCallback, useEffect } from "react";

// Google reCAPTCHA v3: invisible, score-based. The script is loaded on demand (no extra
// dependency) and a token is requested at submit time, then checked server-side.

type Grecaptcha = {
  ready: (cb: () => void) => void;
  execute: (siteKey: string, opts: { action: string }) => Promise<string>;
};

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

let scriptPromise: Promise<Grecaptcha> | null = null;

function loadScript(siteKey: string): Promise<Grecaptcha> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<Grecaptcha>((resolve, reject) => {
    const ready = () => window.grecaptcha!.ready(() => resolve(window.grecaptcha!));
    if (window.grecaptcha?.execute) return ready();
    const s = document.createElement("script");
    s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    s.async = true;
    s.onload = ready;
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("Could not load reCAPTCHA"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export function useRecaptcha(enabled: boolean) {
  // Warm the script up as soon as the form mounts so submit isn't delayed.
  useEffect(() => {
    if (enabled && SITE_KEY) loadScript(SITE_KEY).catch(() => {});
  }, [enabled]);

  // Resolves with a fresh single-use token for `action`.
  return useCallback(async (action: string): Promise<string> => {
    if (!SITE_KEY) throw new Error("reCAPTCHA is not configured. Please call us instead.");
    try {
      const g = await loadScript(SITE_KEY);
      return await g.execute(SITE_KEY, { action });
    } catch {
      throw new Error("Couldn't run the spam check. Please reload the page and try again.");
    }
  }, []);
}
