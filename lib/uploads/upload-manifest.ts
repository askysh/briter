export type UploadVariant = {
  width: number;
  format: "avif" | "webp";
  fileName: string;
  bytes: number;
};

export type UploadManifest = {
  id: string;
  originalWidth: number;
  originalHeight: number;
  variants: UploadVariant[];
};
