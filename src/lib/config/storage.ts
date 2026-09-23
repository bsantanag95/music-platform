/**
 * Límites y presets del servicio de imágenes propias (openspec: add-image-storage).
 * Fuente única: no dispersar constantes en las funciones de validación.
 */

export const STORAGE_LIMITS = {
  maxByteSize: 10 * 1024 * 1024,
  maxDimension: 8192,
} as const;

export type ImageKind = "avatar";

export type ImagePreset = {
  width: number;
  height?: number;
  minWidth: number;
  minHeight: number;
};

export const IMAGE_PRESETS: Record<ImageKind, ImagePreset> = {
  avatar: { width: 256, minWidth: 128, minHeight: 128 },
};

export const ACCEPTED_INPUT_FORMATS = ["jpeg", "png", "webp", "avif"] as const;
export type AcceptedInputFormat = (typeof ACCEPTED_INPUT_FORMATS)[number];
