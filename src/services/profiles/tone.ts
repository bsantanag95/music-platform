import sharp from "sharp";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { releaseGroup, userShowcase } from "@/db/schema";
import { fetchImageBytes } from "@/services/share/images";

// Tono del perfil (spec social-profiles, "Tono del perfil"; openspec:
// redesign-user-profile-phase3): el matiz dominante de la carátula del álbum
// definitorio, con saturación y luminosidad acotadas y un contraste mínimo de 3:1
// sobre la tinta del sitio. Se calcula una vez, al elegir o cambiar el álbum, y se
// guarda en `user_showcase.profile_tone`; visitar el perfil nunca analiza imágenes.
// `null` = el perfil usa el ámbar. Mismo cálculo validado en el mockup D2.

/** Fondo del sitio (`--color-ink`), contra el que se mide el contraste. */
const INK = "#14120f";
const MIN_CONTRAST = 3;
const SAMPLE_SIDE = 48;
const HUE_BINS = 12;
/** Peso mínimo (Σ s²) del sector ganador: menos, la carátula no tiene un color que la defina. */
const MIN_WEIGHT = 20;
const MIN_SATURATION = 0.18;
const BASE_LIGHTNESS = 0.64;
const MAX_LIGHTNESS = 0.8;

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h * 60, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const value = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

/** Relación de contraste WCAG entre dos colores hex. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Tono a partir de píxeles RGB crudos (3 bytes por píxel). Puro: es lo que se prueba.
 * Ignora casi negros y casi blancos; 12 sectores de matiz con peso s²; el sector ganador
 * da el matiz (promedio circular) y su saturación media.
 */
export function toneFromPixels(rgb: Uint8Array | Buffer): string | null {
  const bins = Array.from({ length: HUE_BINS }, () => ({ weight: 0, sin: 0, cos: 0, sat: 0, count: 0 }));

  for (let i = 0; i + 2 < rgb.length; i += 3) {
    const [h, s, l] = rgbToHsl(rgb[i] ?? 0, rgb[i + 1] ?? 0, rgb[i + 2] ?? 0);
    if (l < 0.12 || l > 0.92 || s === 0) continue;
    const bin = bins[Math.floor(h / (360 / HUE_BINS)) % HUE_BINS]!;
    const w = s * s;
    const rad = (h * Math.PI) / 180;
    bin.weight += w;
    bin.sin += Math.sin(rad) * w;
    bin.cos += Math.cos(rad) * w;
    bin.sat += s;
    bin.count += 1;
  }

  const best = bins.reduce((top, bin) => (bin.weight > top.weight ? bin : top));
  if (best.weight < MIN_WEIGHT) return null;
  const saturation = best.sat / best.count;
  if (saturation < MIN_SATURATION) return null;

  const hue = ((Math.atan2(best.sin, best.cos) * 180) / Math.PI + 360) % 360;
  const s = Math.max(saturation, 0.5);
  let l = BASE_LIGHTNESS;
  let hex = hslToHex(hue, s, l);
  while (contrastRatio(hex, INK) < MIN_CONTRAST && l < MAX_LIGHTNESS) {
    l = Math.min(MAX_LIGHTNESS, l + 0.02);
    hex = hslToHex(hue, s, l);
  }
  return hex;
}

/** Tono de una imagen (bytes de cualquier formato que lea `sharp`); `null` si no se puede leer. */
export async function toneFromImage(bytes: Buffer): Promise<string | null> {
  try {
    const { data } = await sharp(bytes)
      .resize(SAMPLE_SIDE, SAMPLE_SIDE, { fit: "cover" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return toneFromPixels(data);
  } catch {
    return null;
  }
}

export type ToneRefresh =
  | { status: "saved"; tone: string | null }
  /** La carátula existe pero no se pudo descargar: el tono guardado no se toca. */
  | { status: "unavailable" };

/**
 * Recalcula y guarda el tono del perfil desde la carátula del álbum definitorio actual.
 * Sin álbum, sin carátula o con una carátula sin matiz dominante, lo deja en `null` (ámbar).
 * Si la carátula no se puede descargar (red, host caído), no cambia nada.
 */
export async function refreshProfileTone(userId: string): Promise<ToneRefresh> {
  const [row] = await db
    .select({ cover: releaseGroup.coverThumbUrl })
    .from(userShowcase)
    .leftJoin(releaseGroup, eq(releaseGroup.id, userShowcase.definingReleaseGroupId))
    .where(eq(userShowcase.userId, userId))
    .limit(1);
  if (!row) return { status: "saved", tone: null };

  let tone: string | null = null;
  if (row.cover) {
    const bytes = await fetchImageBytes(row.cover);
    if (!bytes) return { status: "unavailable" };
    tone = await toneFromImage(bytes);
  }
  await db.update(userShowcase).set({ profileTone: tone }).where(eq(userShowcase.userId, userId));
  return { status: "saved", tone };
}
