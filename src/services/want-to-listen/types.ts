// Tipos de Want to Listen (openspec: add-want-to-listen).
// Fuente única de valores posibles de tipo de objetivo. El contrato API
// (src/lib/api/schemas.ts) los refleja con Zod.

export const WANT_TO_LISTEN_TARGET_TYPES = ["artist", "release-group"] as const;
export type WantToListenTargetType = (typeof WANT_TO_LISTEN_TARGET_TYPES)[number];

export interface WantToListenTarget {
  type: WantToListenTargetType;
  id: string;
}
