"use client";

import { useState } from "react";
import { DetailsDialog } from "@/components/ops/Dialog";
import { QuoteForm } from "@/components/quote/QuoteForm";

// "+ New Customer": opens the form in a popup. It asks for the same details as a new lead plus
// the payment received — a customer is only recorded once they have paid.
export function NewCustomerButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn primary" onClick={() => setOpen(true)}>
        + New Customer
      </button>
      {open && (
        <DetailsDialog
          title="New customer"
          subtitle="Add the customer's details and the payment received. Customers are only recorded once they have paid."
          onClose={() => setOpen(false)}
        >
          <QuoteForm customer embedded onDone={() => setOpen(false)} />
        </DetailsDialog>
      )}
    </>
  );
}
