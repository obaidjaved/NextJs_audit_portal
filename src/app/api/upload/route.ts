import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { auth } from "@/lib/auth";
import { blobConfigured } from "@/lib/blob-config";
import { allow } from "@/lib/rate-limit";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const INLINE_MAX_BYTES = 800 * 1024; // largest photo we'll store inline as a data URL
const UPLOADS_PER_HOUR = 150; // per signed-in user

// The browser says what a file is; check the first bytes really are that kind of file.
function looksLike(type: string, head: Uint8Array): boolean {
  const at = (i: number, s: string) => s.split("").every((c, k) => head[i + k] === c.charCodeAt(0));
  switch (type) {
    case "image/jpeg":
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case "image/png":
      return head[0] === 0x89 && at(1, "PNG");
    case "image/gif":
      return at(0, "GIF8");
    case "image/webp":
      return at(0, "RIFF") && at(8, "WEBP");
    case "image/heic":
      return at(4, "ftyp");
    case "application/pdf":
      return at(0, "%PDF");
    default:
      return false;
  }
}

// Only accept known-safe image types, and derive the stored filename's
// extension from this allowlist — never from the client-supplied filename —
// so a mislabeled upload can't land as .html/.svg/.js in a public directory.
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/heic": ".heic",
  // Payment proofs can be an invoice PDF as well as a screenshot.
  "application/pdf": ".pdf",
};

// Uses Vercel Blob when a Blob store is connected (production/preview).
// Falls back to writing into public/uploads for local dev, where no token
// is configured — same response contract either way: { url }.
export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await allow(`upload:${session.user?.id ?? "unknown"}`, UPLOADS_PER_HOUR, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many uploads. Please wait a while and try again." }, { status: 429 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Unsupported file type (use an image or a PDF)" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (10MB max)" }, { status: 413 });
  }

  if (!looksLike(file.type, new Uint8Array(await file.slice(0, 16).arrayBuffer()))) {
    return NextResponse.json({ error: "That file doesn't look like a real " + (file.type === "application/pdf" ? "PDF." : "image.") }, { status: 415 });
  }

  const filename = `${randomUUID()}${ext}`;

  if (blobConfigured()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(filename, file, { access: "public", contentType: file.type });
    return NextResponse.json({ url: blob.url });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Local dev: write into public/uploads. Vercel's filesystem is read-only, so
  // writing there fails; fall through to the inline fallback below.
  if (!process.env.VERCEL) {
    try {
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadsDir, { recursive: true });
      await writeFile(path.join(uploadsDir, filename), buffer);
      return NextResponse.json({ url: `/uploads/${filename}` });
    } catch {
      /* fall through */
    }
  }

  // No Blob store configured: keep the (browser-compressed) photo inline in
  // the audit as a data URL so uploads still work. Connect a Blob store
  // to store photos as files instead.
  if (buffer.length > INLINE_MAX_BYTES) {
    return NextResponse.json(
      { error: "Photo is too large to store without a Blob store. Try a smaller photo, or ask your admin to enable photo storage." },
      { status: 413 },
    );
  }
  return NextResponse.json({ url: `data:${file.type};base64,${buffer.toString("base64")}` });
}
