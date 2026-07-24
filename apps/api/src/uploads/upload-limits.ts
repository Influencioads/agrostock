/**
 * API-03: shared multer limits for every upload endpoint.
 *
 * Multer's default memory storage buffers the ENTIRE request body into RAM before
 * any handler (or the UploadsService size check) runs. Without a `fileSize` limit
 * an authenticated user could stream multi-GB uploads and OOM the API — the 10 MB
 * check only fired after the whole file was already in memory. `limits.fileSize`
 * makes multer abort the stream at the byte ceiling instead. Kept in sync with
 * `UPLOAD_MAX_MB` (the same env the service enforces after decoding).
 */
export function uploadLimits(maxFiles = 1) {
  const maxMb = Number(process.env.UPLOAD_MAX_MB) || 10;
  return { limits: { fileSize: maxMb * 1024 * 1024, files: maxFiles } };
}
