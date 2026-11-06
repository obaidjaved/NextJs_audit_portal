import { redirect } from "next/navigation";

export const metadata = { title: "New customer" };

// "+ New Customer" is a popup on the Customers page now.
export default function NewCustomerPage() {
  redirect("/customers");
}
