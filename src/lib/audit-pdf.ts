import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import type { Audit } from "@/lib/repo-types";
import { auditStatus, type ResponseObject } from "@/lib/scoring";

// Builds the audit report as a PDF (A4) from the saved audit: header, result,
// every finding, notes, photos and the signature. Used by the "PDF" icon on the
// Audits page and as the email attachment.

const W = 595;
const H = 842;
const M = 48; // page margin
const INK = rgb(0.09, 0.09, 0.11);
const MUTED = rgb(0.44, 0.43, 0.39);
const RULE = rgb(0.9, 0.88, 0.8);

// The built-in PDF fonts only know Latin-1 (+ a few punctuation marks); anything else becomes "?".
const EXTRA = new Set([0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2026, 0x20ac]);
function clean(text: string): string {
  let out = "";
  for (const ch of text.replace(/\r/g, "")) {
    const c = ch.codePointAt(0) ?? 63;
    out += c === 10 || (c >= 32 && c <= 126) || (c >= 160 && c <= 255) || EXTRA.has(c) ? ch : "?";
  }
  return out;
}

function hexColor(hex: string | null | undefined, fallback: [number, number, number]) {
  const m = hex && /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return rgb(...fallback);
  const n = parseInt(m[1], 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

async function loadImageBytes(src: string): Promise<{ bytes: Uint8Array; type: "png" | "jpg" } | null> {
  try {
    if (src.startsWith("data:")) {
      const m = /^data:image\/(png|jpe?g);base64,(.*)$/i.exec(src);
      if (!m) return null;
      return { bytes: Uint8Array.from(Buffer.from(m[2], "base64")), type: m[1].toLowerCase() === "png" ? "png" : "jpg" };
    }
    let buf: Buffer;
    if (src.startsWith("/uploads/")) {
      buf = await readFile(path.join(process.cwd(), "public", src));
    } else if (src.startsWith("https://")) {
      const res = await fetch(src);
      if (!res.ok) return null;
      buf = Buffer.from(await res.arrayBuffer());
    } else {
      return null;
    }
    // Sniff the real type from the file header (jpeg: FF D8, png: 89 50).
    if (buf[0] === 0xff && buf[1] === 0xd8) return { bytes: new Uint8Array(buf), type: "jpg" };
    if (buf[0] === 0x89 && buf[1] === 0x50) return { bytes: new Uint8Array(buf), type: "png" };
    return null; // webp / gif / video aren't supported by the PDF library
  } catch {
    return null;
  }
}

class Writer {
  page!: PDFPage;
  y = 0;
  constructor(
    readonly doc: PDFDocument,
    readonly font: PDFFont,
    readonly bold: PDFFont,
  ) {
    this.newPage();
  }

  newPage() {
    this.page = this.doc.addPage([W, H]);
    this.y = H - M;
  }

  ensure(height: number) {
    if (this.y - height < M + 24) this.newPage();
  }

  wrap(text: string, font: PDFFont, size: number, width: number): string[] {
    const lines: string[] = [];
    for (const para of clean(text).split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/).filter(Boolean)) {
        // Break words that are wider than the line (long URLs, ids).
        let w = word;
        while (font.widthOfTextAtSize(w, size) > width) {
          let cut = w.length - 1;
          while (cut > 1 && font.widthOfTextAtSize(w.slice(0, cut), size) > width) cut--;
          if (line) {
            lines.push(line);
            line = "";
          }
          lines.push(w.slice(0, cut));
          w = w.slice(cut);
        }
        const test = line ? `${line} ${w}` : w;
        if (font.widthOfTextAtSize(test, size) > width) {
          if (line) lines.push(line);
          line = w;
        } else {
          line = test;
        }
      }
      lines.push(line);
    }
    return lines;
  }

  text(text: string, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number; width?: number; gap?: number } = {}) {
    const size = opts.size ?? 10.5;
    const font = opts.bold ? this.bold : this.font;
    const x = opts.x ?? M;
    const width = opts.width ?? W - M - x;
    const lineH = size * 1.4;
    for (const line of this.wrap(text, font, size, width)) {
      this.ensure(lineH);
      this.y -= lineH;
      if (line) this.page.drawText(line, { x, y: this.y, size, font, color: opts.color ?? INK });
    }
    this.y -= opts.gap ?? 0;
  }

  rule() {
    this.ensure(10);
    this.y -= 6;
    this.page.drawLine({ start: { x: M, y: this.y }, end: { x: W - M, y: this.y }, thickness: 0.6, color: RULE });
    this.y -= 6;
  }

  async image(img: PDFImage, maxW: number, maxH: number) {
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    const w = img.width * scale;
    const h = img.height * scale;
    this.ensure(h + 6);
    this.y -= h;
    this.page.drawImage(img, { x: M, y: this.y, width: w, height: h });
    this.y -= 6;
  }
}

function describe(r: ResponseObject): string {
  switch (r.type) {
    case "status":
      return r.value === "pass" ? "Pass" : r.value === "marginal" ? "Marginal" : "Fail";
    case "choice":
      return r.option ? r.option.label : "No answer";
    case "checkbox":
      return r.checked ? (r.checked.length ? r.checked.join(", ") : "None selected") : r.value ? "Yes" : "No";
    case "slider":
      return `${r.value}/100`;
    case "number":
    case "date":
    case "text":
      return r.value || "-";
    case "location":
      return r.value || "-";
    case "signature":
      return r.value ? "Signed" : "Not signed";
    case "photo":
    case "annotation":
      return r.value ? "" : "No media";
    default:
      return "";
  }
}

export async function buildAuditPdf(audit: Audit): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new Writer(doc, font, bold);
  const accent = hexColor(audit.template.reportAccentColor, [1, 0.478, 0.102]);
  const status = auditStatus(audit);
  const responses = (Array.isArray(audit.responses) ? audit.responses : []) as ResponseObject[];
  const when = audit.date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // Header band
  w.page.drawRectangle({ x: 0, y: H - 110, width: W, height: 110, color: accent });
  w.page.drawText("INSPECTION REPORT", { x: M, y: H - 38, size: 9.5, font: bold, color: rgb(1, 1, 1) });
  w.page.drawText(clean(audit.title).slice(0, 60), { x: M, y: H - 62, size: 20, font: bold, color: rgb(1, 1, 1) });
  w.page.drawText(clean(`${audit.docNumber}  |  ${audit.customer.name}  |  ${when}`).slice(0, 90), { x: M, y: H - 84, size: 10, font, color: rgb(1, 1, 1) });
  w.y = H - 110 - 22;

  // Result
  w.text(`Result: ${status}${audit.score !== null && !audit.draft ? `   |   Score: ${audit.score}` : ""}`, { size: 13, bold: true, gap: 4 });
  const site = [audit.customer.site, [audit.customer.city, audit.customer.state].filter(Boolean).join(", ")].filter(Boolean).join(", ");
  if (site) w.text(`Site: ${site}`, { color: MUTED });
  if (audit.inspector) w.text(`Auditor: ${audit.inspector.name}`, { color: MUTED });
  w.rule();

  // Findings
  w.text("Findings", { size: 13, bold: true, gap: 4 });
  if (responses.length === 0) w.text("No responses were recorded.", { color: MUTED });
  for (const r of responses) {
    if (r.type === "signature") continue; // shown at the end
    w.ensure(36);
    w.text(r.label, { bold: true, size: 10.5 });
    const value = describe(r);
    if (value) w.text(value, { x: M + 10, width: W - 2 * M - 10, gap: 2 });
    if ((r.type === "photo" || r.type === "annotation") && r.value) {
      const loaded = await loadImageBytes(r.value);
      if (loaded) {
        const img = loaded.type === "png" ? await doc.embedPng(loaded.bytes) : await doc.embedJpg(loaded.bytes);
        await w.image(img, 260, 190);
      } else {
        w.text("(Attached media can't be shown in the PDF - open the audit in the portal to view it.)", { x: M + 10, color: MUTED, size: 9 });
      }
      if (r.caption) w.text(r.caption, { x: M + 10, width: W - 2 * M - 10, color: MUTED, size: 9.5 });
    }
    w.y -= 6;
  }

  // Notes
  if (audit.notes?.trim()) {
    w.rule();
    w.text("Notes", { size: 13, bold: true, gap: 4 });
    w.text(audit.notes);
  }

  // Photo evidence
  const photos = (Array.isArray(audit.photos) ? audit.photos : []) as { id: string; src: string }[];
  if (photos.length > 0) {
    w.rule();
    w.text("Photo evidence", { size: 13, bold: true, gap: 6 });
    for (const p of photos) {
      const loaded = await loadImageBytes(p.src);
      if (!loaded) continue;
      const img = loaded.type === "png" ? await doc.embedPng(loaded.bytes) : await doc.embedJpg(loaded.bytes);
      await w.image(img, 300, 220);
    }
  }

  // Signature (the audit's own, or a Signature field in the template)
  const sigField = responses.find((r) => r.type === "signature" && r.value);
  const signature = audit.signature || (sigField && sigField.type === "signature" ? sigField.value : null);
  if (signature) {
    const loaded = await loadImageBytes(signature);
    if (loaded) {
      w.rule();
      w.text("Inspector signature", { size: 13, bold: true, gap: 6 });
      const img = loaded.type === "png" ? await doc.embedPng(loaded.bytes) : await doc.embedJpg(loaded.bytes);
      await w.image(img, 220, 90);
    }
  }

  // Footer on every page
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    page.drawText(clean(`${audit.docNumber} - ${audit.customer.name}`), { x: M, y: 26, size: 8.5, font, color: MUTED });
    const label = `Page ${i + 1} of ${pages.length}`;
    page.drawText(label, { x: W - M - font.widthOfTextAtSize(label, 8.5), y: 26, size: 8.5, font, color: MUTED });
  });

  return doc.save();
}
