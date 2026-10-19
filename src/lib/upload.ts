// Phone photos are routinely 4-10MB, but a Vercel function rejects request
// bodies over 4.5MB. Shrink them in the browser first: it makes uploads fast
// and keeps them under that limit.
const MAX_EDGE = 1600;
const SKIP_UNDER_BYTES = 300 * 1024;
const TARGET_BYTES = 600 * 1024;

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close?: () => void } | null> {
  try {
    const bmp = await createImageBitmap(file);
    return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
  } catch {
    return null; // e.g. HEIC in a browser that can't decode it
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

export async function compressImage(file: File): Promise<File> {
  const small = ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= SKIP_UNDER_BYTES;
  if (small) return file;

  const img = await decode(file);
  if (!img) return file;

  try {
    let edge = MAX_EDGE;
    let quality = 0.82;
    let best: Blob | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const scale = Math.min(1, edge / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.fillStyle = "#fff"; // PNGs with transparency would otherwise turn black as JPEG
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img.source, 0, 0, canvas.width, canvas.height);
      best = await toBlob(canvas, quality);
      if (!best) return file;
      if (best.size <= TARGET_BYTES) break;
      edge = Math.round(edge * 0.75);
      quality = Math.max(0.6, quality - 0.08);
    }
    if (!best || best.size >= file.size) return file;
    return new File([best], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } finally {
    img.close?.();
  }
}

const VIDEO_EXT: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };

async function uploadVideo(file: File): Promise<string> {
  const ext = VIDEO_EXT[file.type];
  if (!ext) throw new Error("Unsupported video type. Use MP4, MOV or WebM.");
  try {
    const { upload } = await import("@vercel/blob/client");
    const blob = await upload(`videos/${crypto.randomUUID()}.${ext}`, file, { access: "public", handleUploadUrl: "/api/upload/video" });
    return blob.url;
  } catch {
    throw new Error("Couldn't upload the video. If it keeps failing, video storage (Vercel Blob) may not be enabled for this site.");
  }
}

export async function uploadFile(original: File): Promise<string> {
  if (original.type.startsWith("video/")) return uploadVideo(original);
  const file = await compressImage(original);
  const form = new FormData();
  form.append("file", file);

  let res: Response;
  try {
    res = await fetch("/api/upload", { method: "POST", body: form });
  } catch {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (body?.error) throw new Error(body.error);
    if (res.status === 413) throw new Error("That photo is too large to upload. Try a smaller one.");
    throw new Error("Upload failed. Please try again.");
  }
  const data: { url: string } | null = await res.json().catch(() => null);
  if (!data?.url) throw new Error("Upload failed. Please try again.");
  return data.url;
}
