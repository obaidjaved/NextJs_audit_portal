import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("changeme123", 10);
  await prisma.user.upsert({
    where: { email: "admin@tapsvs.com" },
    update: {},
    create: {
      name: "TAP Admin",
      email: "admin@tapsvs.com",
      passwordHash,
      role: "ADMIN",
    },
  });

  const customer = await prisma.customer.upsert({
    where: { id: "seed-customer-1" },
    update: {},
    create: {
      id: "seed-customer-1",
      name: "Riverside Medical Plaza",
      site: "Building B",
      city: "Austin",
      state: "Texas",
      zip: "78701",
      contact: "Facilities Manager",
    },
  });

  await prisma.template.upsert({
    where: { id: "seed-template-1" },
    update: {},
    create: {
      id: "seed-template-1",
      name: "Panel & Breaker Inspection",
      category: "ELECTRICAL",
      approvalRequired: false,
      reportStyle: "MODERN",
      fields: [
        {
          id: "f1",
          label: "Panel cover intact",
          type: "status",
          required: true,
        },
        {
          id: "f2",
          label: "Breaker condition",
          type: "choice",
          required: true,
          presetKey: "good-fair-poor",
          options: [
            { label: "Good", score: 100, fail: false },
            { label: "Fair", score: 60, fail: false },
            { label: "Poor", score: 0, fail: true },
          ],
        },
        {
          id: "f3",
          label: "Photo evidence",
          type: "photo",
          required: false,
        },
        {
          id: "f4",
          label: "Additional notes",
          type: "text",
          required: false,
        },
      ],
    },
  });

  console.log("Seeded:", { customer: customer.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
