import { NextResponse } from "next/server";
import { audits as auditsRepo, actions as actionsRepo } from "@/lib/wp/repo";
import { auth } from "@/lib/auth";
import { auditStatus } from "@/lib/scoring";

// Spreadsheet formula injection guard: cells starting with = + - @ are prefixed with a quote.
function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const status = url.searchParams.get("status") ?? "All";

  const [audits, allActions] = await Promise.all([auditsRepo.list({ q, noResponses: true }), actionsRepo.list()]);
  const actionCounts = new Map<string, number>();
  for (const a of allActions) if (a.auditId) actionCounts.set(a.auditId, (actionCounts.get(a.auditId) ?? 0) + 1);

  const rows = audits
    .map((a) => ({ a, st: auditStatus(a) }))
    .filter(({ st }) => status === "All" || st === status);

  const header = ["Doc #", "Title", "Customer", "Site", "Date", "Status", "Score", "Critical fail", "Inspector", "Corrective actions"];
  const lines = [header.map(csvCell).join(",")];
  for (const { a, st } of rows) {
    lines.push(
      [
        a.docNumber,
        a.title,
        a.customer.name,
        a.customer.site,
        a.date.toISOString().slice(0, 10),
        st,
        a.score,
        a.criticalFail ? "Yes" : "No",
        a.inspector?.name,
        actionCounts.get(a.id) ?? 0,
      ]
        .map(csvCell)
        .join(","),
    );
  }

  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audits-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
