"use client";

import { QuoteForm } from "@/components/quote/QuoteForm";

// Staff "Add lead": the public request-a-quote form, saved straight to the Leads list.
export function LeadForm() {
  return <QuoteForm internal />;
}
