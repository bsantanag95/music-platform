// Colores de la marca para las imágenes de compartir (openspec: add-share-foundation). El renderizador de
// imágenes no lee variables CSS, así que se repiten acá en hex; `brand-tokens.test.ts` comprueba que
// coinciden con `src/app/globals.css`, la fuente de verdad (docs/02-architecture/design-tokens-naming.md).

export const BRAND_COLORS = {
  ink: "#14120f",
  inkSurface: "#1f1b17",
  inkBorder: "#2e2a24",
  paper: "#f2ede4",
  paperMuted: "#a89e8e",
  amber: "#e8b84b",
  petrol: "#4a7c7c",
  danger: "#d96c5f",
} as const;

/** Variable CSS de la que sale cada color, para la prueba de sincronía. */
export const BRAND_COLOR_VARIABLES: Record<keyof typeof BRAND_COLORS, string> = {
  ink: "--color-ink",
  inkSurface: "--color-ink-surface",
  inkBorder: "--color-ink-border",
  paper: "--color-paper",
  paperMuted: "--color-paper-muted",
  amber: "--color-amber",
  petrol: "--color-petrol",
  danger: "--color-danger",
};

/** Glifo del monograma provisional de la marca; lo comparten el logo del header y la firma de las imágenes. */
export const BRAND_MONOGRAM = "♪";
