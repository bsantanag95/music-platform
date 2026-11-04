import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Tipografías de la marca para las imágenes de compartir (spec share-images, "Tipografías de la marca").
// El renderizador necesita los bytes de archivos TTF estáticos: `next/font/google` no los expone. Viven en
// `assets/fonts/` con sus licencias OFL y se leen una vez por proceso; nunca se piden a la red.

export const SHARE_FONT_FAMILIES = {
  display: "Space Grotesk",
  data: "IBM Plex Mono",
  body: "Source Serif 4",
} as const;

type FontWeight = 400 | 500 | 700;

export interface ShareFont {
  name: string;
  data: ArrayBuffer;
  weight: FontWeight;
  style: "normal" | "italic";
}

const FONT_FILES: ReadonlyArray<Omit<ShareFont, "data"> & { file: string }> = [
  { name: SHARE_FONT_FAMILIES.display, weight: 500, style: "normal", file: "SpaceGrotesk-500.ttf" },
  { name: SHARE_FONT_FAMILIES.display, weight: 700, style: "normal", file: "SpaceGrotesk-700.ttf" },
  { name: SHARE_FONT_FAMILIES.data, weight: 400, style: "normal", file: "IBMPlexMono-400.ttf" },
  { name: SHARE_FONT_FAMILIES.data, weight: 500, style: "normal", file: "IBMPlexMono-500.ttf" },
  { name: SHARE_FONT_FAMILIES.body, weight: 400, style: "normal", file: "SourceSerif4-400.ttf" },
  { name: SHARE_FONT_FAMILIES.body, weight: 400, style: "italic", file: "SourceSerif4-400-italic.ttf" },
];

export const SHARE_FONTS_DIR = join(process.cwd(), "assets", "fonts");

let loaded: Promise<ShareFont[]> | null = null;

/** Fuentes de la marca, leídas del disco la primera vez y memorizadas por proceso. */
export function loadShareFonts(): Promise<ShareFont[]> {
  if (!loaded) {
    loaded = Promise.all(
      FONT_FILES.map(async ({ file, ...font }) => {
        const buffer = await readFile(join(SHARE_FONTS_DIR, file));
        const data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
        return { ...font, data };
      }),
    ).catch((error: unknown) => {
      // Un fallo no se memoriza: el próximo pedido reintenta.
      loaded = null;
      throw error;
    });
  }
  return loaded;
}

/** Solo para pruebas. */
export function resetShareFontsForTests(): void {
  loaded = null;
}
