import type { Metadata } from "next";
import { QuoteForm } from "@/components/quote/QuoteForm";

// Public, unauthenticated. Submissions land in the portal under Customers > New Requests.
export const metadata: Metadata = {
  title: "Request a Quote | TAP Services",
  description: "Request a custom quote for electrical engineering, auditing, maintenance, or training services.",
};

export default function RequestQuotePage() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "32px 16px 64px" }}>
      <header style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--accent-ink)", marginBottom: 6 }}>TAP Services</div>
        <h1 className="disp" style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Request a Quote</h1>
        <p style={{ color: "var(--ink-2)", fontSize: 14, lineHeight: 1.6, maxWidth: 620 }}>
          Complete the form below to receive a custom quote for electrical engineering, auditing, maintenance, or training services.
          Our team will review your scope and get back to you within 24 hours.
        </p>
      </header>
      <QuoteForm />
    </main>
  );
}
