const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

// reCAPTCHA v3 scores run 0.0 (bot) to 1.0 (human). Google suggests 0.5 as the default.
const MIN_SCORE = Number(process.env.RECAPTCHA_MIN_SCORE) || 0.5;

type SiteVerifyResponse = {
  success: boolean;
  score?: number;
  action?: string;
  "error-codes"?: string[];
};

// Server-side check of a reCAPTCHA v3 token from the public quote form.
// Fails closed: a missing secret, a network error, a rejected token, a low score or a
// mismatched action all throw, so a misconfigured deploy blocks the form instead of
// silently letting bots through.
export async function verifyRecaptcha(token: unknown, expectedAction: string, ip?: string): Promise<void> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.error("RECAPTCHA_SECRET_KEY is not set; refusing quote submissions until it is configured.");
    throw new Error("The form is temporarily unavailable. Please call us instead.");
  }
  if (typeof token !== "string" || token.trim() === "") {
    throw new Error("We couldn't verify your submission. Please reload the page and try again.");
  }

  const body = new URLSearchParams({ secret, response: token });
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  let result: SiteVerifyResponse;
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    result = (await res.json()) as SiteVerifyResponse;
  } catch (err) {
    console.error("reCAPTCHA verification request failed", err);
    throw new Error("We couldn't verify your submission. Please try again.");
  }

  if (!result.success) {
    console.warn("reCAPTCHA rejected", result["error-codes"]);
    throw new Error("Spam check failed. Please reload the page and try again.");
  }
  if (result.action !== expectedAction) {
    console.warn("reCAPTCHA action mismatch", result.action);
    throw new Error("Spam check failed. Please reload the page and try again.");
  }
  if ((result.score ?? 0) < MIN_SCORE) {
    console.warn("reCAPTCHA score too low", result.score);
    throw new Error("Our spam filter blocked this submission. Please call us to request your quote.");
  }
}
