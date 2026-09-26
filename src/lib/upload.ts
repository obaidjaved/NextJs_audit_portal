export async function uploadFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || "Upload failed");
  }
  const data: { url: string } | null = await res.json().catch(() => null);
  if (!data?.url) throw new Error("Upload failed");
  return data.url;
}
