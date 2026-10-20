// A Blob store can be linked to a Vercel project two ways: the classic
// BLOB_READ_WRITE_TOKEN, or (newer projects) BLOB_STORE_ID with OIDC sign-in,
// which the @vercel/blob SDK handles on its own. Either means storage is on.
export const blobConfigured = (): boolean => Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
