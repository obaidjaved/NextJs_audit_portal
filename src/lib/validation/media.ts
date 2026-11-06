// What may be stored in a photo, drawing, signature or video field of an audit. Anything else (an arbitrary web address,
// a script or HTML data URL) is refused, so a report can never point a viewer's browser at someone else's server.

const MAX_DATA_URL = 3_500_000; // characters; browser-compressed photos are far smaller
const DATA_IMAGE = /^data:image\/(png|jpe?g|webp|gif|heic);base64,[A-Za-z0-9+/=]+$/;
const BLOB_URL = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/[\w./%-]+$/i;
const LOCAL_UPLOAD = /^\/uploads\/[0-9a-f-]{36}\.(jpg|png|webp|gif|heic|pdf)$/;

export function isSafeMediaSrc(value: string): boolean {
  if (value.startsWith("data:")) return value.length <= MAX_DATA_URL && DATA_IMAGE.test(value);
  return BLOB_URL.test(value) || LOCAL_UPLOAD.test(value);
}

export const MEDIA_MESSAGE = "That file isn't from this portal's uploader.";
