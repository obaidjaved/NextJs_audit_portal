// Optional demo data: extra customers, an inspector, a year of inspections,
// and the corrective actions they raise. Run after the base seed:
//   npm run db:seed-demo
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { computeScore, computeCriticalFail, type ResponseObject } from "../src/lib/scoring";
import { findingsNeedingAction } from "../src/lib/corrective-pure";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CONDITION = [
  { label: "Good", score: 100, fail: false },
  { label: "Fair", score: 60, fail: false },
  { label: "Poor", score: 0, fail: true },
];

function responses(panelCover: "pass" | "marginal" | "fail", cond: 0 | 1 | 2): ResponseObject[] {
  return [
    { label: "Panel cover intact", type: "status", value: panelCover },
    { label: "Breaker condition", type: "choice", option: CONDITION[cond] },
    { label: "Photo evidence", type: "photo", value: null, caption: "" },
    { label: "Additional notes", type: "text", value: "" },
  ];
}

async function main() {
  const template = await prisma.template.findUniqueOrThrow({ where: { id: "seed-template-1" } });
  const hash = await bcrypt.hash("changeme123", 10);

  const inspector = await prisma.user.upsert({
    where: { email: "inspector@tapsvs.com" },
    update: {},
    create: { name: "Travis Perry", email: "inspector@tapsvs.com", passwordHash: hash, role: "INSPECTOR" },
  });

  const customers = [
    ["seed-customer-1", "Riverside Medical Plaza", "Building B"],
    ["seed-customer-2", "Northgate Data Center", "North Campus"],
    ["seed-customer-3", "Lakeside Cold Storage", "Main campus"],
  ] as const;
  for (const [id, name, site] of customers) {
    await prisma.customer.upsert({ where: { id }, update: {}, create: { id, name, site, city: "Austin", state: "Texas", zip: "78701" } });
  }

  if ((await prisma.audit.count({ where: { docNumber: { startsWith: "EL-" } } })) > 0) {
    console.log("Demo audits already present; skipping audit creation.");
    return;
  }

  const plan: [string, number, ResponseObject[]][] = [
    ["seed-customer-1", 340, responses("pass", 0)],
    ["seed-customer-2", 300, responses("pass", 1)],
    ["seed-customer-3", 250, responses("marginal", 1)],
    ["seed-customer-1", 200, responses("pass", 0)],
    ["seed-customer-2", 150, responses("fail", 2)],
    ["seed-customer-3", 100, responses("pass", 0)],
    ["seed-customer-1", 60, responses("marginal", 0)],
    ["seed-customer-2", 30, responses("pass", 0)],
    ["seed-customer-1", 5, responses("fail", 1)],
  ];

  let seq = 0;
  for (const [customerId, daysAgo, r] of plan) {
    seq += 1;
    const date = new Date(Date.now() - daysAgo * 86_400_000);
    const audit = await prisma.audit.create({
      data: {
        docNumber: `EL-${String(seq).padStart(4, "0")}`,
        templateId: template.id,
        customerId,
        inspectorId: inspector.id,
        title: template.name,
        score: computeScore(r),
        criticalFail: computeCriticalFail(r),
        draft: false,
        pendingApproval: false,
        date,
        responses: r as unknown as object[],
        notes: "Demo inspection.",
        photos: [],
      },
    });
    await prisma.auditEvent.create({ data: { auditId: audit.id, userId: inspector.id, message: "Inspection submitted", createdAt: date } });
    for (const f of findingsNeedingAction(r)) {
      await prisma.correctiveAction.create({
        data: {
          title: `Resolve: ${f.label}`,
          description: `${f.detail} on ${audit.title}.`,
          priority: f.priority,
          findingLabel: f.label,
          auditId: audit.id,
          customerId,
          createdById: inspector.id,
          dueDate: new Date(date.getTime() + (f.priority === "HIGH" ? 14 : 30) * 86_400_000),
          status: daysAgo > 120 ? "RESOLVED" : "OPEN",
          resolvedAt: daysAgo > 120 ? new Date(date.getTime() + 10 * 86_400_000) : null,
        },
      });
    }
  }
  await prisma.docSequence.upsert({ where: { category: "ELECTRICAL" }, update: { lastSeq: seq }, create: { category: "ELECTRICAL", lastSeq: seq } });
  console.log(`Demo data created: ${seq} audits.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
