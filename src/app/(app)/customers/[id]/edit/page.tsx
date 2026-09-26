import { notFound } from "next/navigation";
import { customers } from "@/lib/wp/repo";
import { CustomerForm } from "@/components/customers/CustomerForm";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await customers.get(id);
  if (!customer) notFound();

  return (
    <div>
      <h1 className="disp" style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>
        Edit Customer
      </h1>
      {/* key forces a remount if navigating directly between two customers'
          edit pages — see the matching comment on TemplateBuilder's usage. */}
      <CustomerForm
        key={customer.id}
        customerId={customer.id}
        initial={{
          name: customer.name,
          site: customer.site ?? "",
          city: customer.city ?? "",
          state: customer.state ?? "",
          zip: customer.zip ?? "",
          contact: customer.contact ?? "",
          email: customer.email ?? "",
          phone: customer.phone ?? "",
        }}
      />
    </div>
  );
}
