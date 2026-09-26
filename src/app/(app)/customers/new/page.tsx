import { CustomerForm } from "@/components/customers/CustomerForm";

export default function NewCustomerPage() {
  return (
    <div>
      <h1 className="disp" style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>
        New Customer
      </h1>
      <CustomerForm />
    </div>
  );
}
