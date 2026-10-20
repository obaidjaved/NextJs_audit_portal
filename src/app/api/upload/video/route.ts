import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/lib/auth";
import { blobConfigured } from "@/lib/blob-config";

const MAX_VIDEO_BYTES = 150 * 1024 * 1024; // 150MB

// Videos are far larger than a serverless function will accept (4.5MB), so the
// browser sends them straight to Vercel Blob; this route only hands out the
// short-lived upload token. That needs a connected Blob store.
export async function POST(request: Request) {
  if (!blobConfigured()) {
    return NextResponse.json(
      { error: "Video upload needs file storage (Vercel Blob) to be enabled for this site. Photos work without it." },
      { status: 501 },
    );
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
