// Media fields hold either a photo or a video; both are stored as a URL string.
export function isVideoSrc(src: string): boolean {
  return src.startsWith("data:video/") || /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(src);
}
