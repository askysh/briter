const SAFE_UPLOAD_PATH = /^[a-f0-9]{32,64}(?:-\d+)?\.(?:avif|webp|png|jpe?g)$/;

export function isSafeUploadPath(value: string) {
  return SAFE_UPLOAD_PATH.test(value);
}
