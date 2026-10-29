import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { audits } from "@/lib/repo";
import { buildAuditPdf } from "@/lib/audit-pdf";
import { canAccessAudit } from "@/lib/audit-access";

export const maxDuration = 30;

// GET /api/audits/{id}/pdf            -> downloads the report
// GET /api/audits/{id}/pdf?inline=1   -> shows it in the browser (preview)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const audit = await audits.get(id);
  if (!audit) return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  const role = session.user.role === "ADMIN" ? "ADMIN" : "INSPECTOR";
  if (!(await canAccessAudit({ id: session.user.id, role }, audit))) return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  // A report sent back for correction was submitted once, so its PDF stays viewable.
  if (audit.draft && !audit.needsCorrection) {
    return NextResponse.json({ error: "The report is only available once the audit has been submitted." }, { status: 409 });
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
