import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/lib/auth";

const MAX_VIDEO_BYTES = 150 * 1024 * 1024; // 150MB

// Videos are far larger than a serverless function will accept (4.5MB), so the
// browser sends them straight to Vercel Blob; this route only hands out the
// short-lived upload token, which can only be minted from a classic Blob
// read-write token (BLOB_READ_WRITE_TOKEN) — a store linked by BLOB_STORE_ID
// alone isn't enough for this.
const NOT_READY =
  "Video upload needs a Blob read-write token. Add BLOB_READ_WRITE_TOKEN (from the Blob store's .env.local tab) to this site's environment variables and redeploy. Photos work without it.";

// Lets the browser check up front, so it can show the real reason.
export async function GET() {
  return NextResponse.json({ enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN), reason: NOT_READY });
}

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: NOT_READY }, { status: 501 });
  }

  const body = (await request.json()) as HandleUploadBody;

  // The token request comes from a signed-in browser; the completion callback
  // comes from Vercel's servers, so only the former can be checked for a session.
  if (body.type === "blob.generate-client-token") {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["video/mp4", "video/webm", "video/quicktime"],
        maximumSizeInBytes: MAX_VIDEO_BYTES,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Video upload failed" }, { status: 400 });
  }
}
