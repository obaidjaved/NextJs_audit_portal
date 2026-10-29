import { redirect } from "next/navigation";

// "+ New Customer" is a popup on the Customers page now.
export default function NewCustomerPage() {
  redirect("/customers");
}
