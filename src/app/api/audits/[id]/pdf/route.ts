import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { audits } from "@/lib/repo";
import { buildAuditPdf } from "@/lib/audit-pdf";

// GET /api/audits/{id}/pdf            -> downloads the report
// GET /api/audits/{id}/pdf?inline=1   -> shows it in the browser (preview)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const audit = await audits.get(id);
  if (!audit) return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  if (audit.draft || audit.pendingApproval) {
    return NextResponse.json({ error: "The report is only available once the audit is completed and approved." }, { status: 409 });
  }

  const pdf = await buildAuditPdf(audit);
  const inline = new URL(request.url).searchParams.get("inline") === "1";
  const filename = `${audit.docNumber}.pdf`.replace(/[^\w.-]+/g, "_");
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
