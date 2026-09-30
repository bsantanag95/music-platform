// Direcciones públicas con `slug-<id>` (openspec: add-catalog-slugs). El id es la
// verdad (UUID interno codificado en base58) y el slug es decorativo: se calcula
// al renderizar a partir del nombre y nunca se guarda ni se hace único.

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Alfabeto base58 de Bitcoin: sin `0`, `O`, `I` ni `l`. */
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Un UUID son 128 bits; 58^22 > 2^128, así que la forma canónica mide 22 caracteres. */
const ENCODED_LENGTH = 22;
const MAX_VALUE = 1n << 128n;

function uuidToBigInt(uuid: string): bigint | null {
  if (!UUID_REGEX.test(uuid)) return null;
  return BigInt(`0x${uuid.replace(/-/g, "")}`);
}

function bigIntToUuid(value: bigint): string {
  const hex = value.toString(16).padStart(32, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * UUID → base58 de exactamente 22 caracteres, relleno a la izquierda con `1`
 * hasta la longitud fija (cada UUID tiene una única representación canónica).
 */
export function encodeId(uuid: string): string {
  const value = uuidToBigInt(uuid);
  if (value === null) throw new TypeError(`UUID inválido: ${uuid}`);
  let remaining = value;
  let encoded = "";
  while (remaining > 0n) {
    const digit = Number(remaining % 58n);
    encoded = BASE58_ALPHABET[digit]! + encoded;
    remaining /= 58n;
  }
  return encoded.padStart(ENCODED_LENGTH, "1");
}

/**
 * Base58 de 22 caracteres → UUID, o `null` si la longitud, el alfabeto o el
 * valor (≥ 2^128) son inválidos. Un id mal escrito nunca resuelve a otra entidad.
 */
export function decodeId(str: string): string | null {
  if (str.length !== ENCODED_LENGTH) return null;
  let value = 0n;
  for (const char of str) {
    const index = BASE58_ALPHABET.indexOf(char);
    if (index === -1) return null;
    value = value * 58n + BigInt(index);
  }
  if (value >= MAX_VALUE) return null;
  return bigIntToUuid(value);
}

const SLUG_REPLACEMENTS: Record<string, string> = {
  ø: "o",
  đ: "d",
  ł: "l",
  æ: "ae",
  œ: "oe",
  ß: "ss",
  þ: "th",
};

const APOSTROPHES = /['’ʼ‘`´]/g;
const NOT_SLUG = /[^\p{L}\p{N}\p{M}]+/gu;

/**
 * Nombre → slug legible: sin diacríticos latinos, en minúsculas, sin
 * apóstrofos y con `-` para el resto. Las letras no latinas se conservan
 * (sin transliterar) y el hangul y el kana se recomponen íntegros.
 */
export function slugify(text: string): string {
  const withoutMarks = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC")
    .toLowerCase();
  const mapped = withoutMarks.replace(/[øđłæœßþ]/g, (char) => SLUG_REPLACEMENTS[char] ?? char);
  const withoutApostrophes = mapped.replace(APOSTROPHES, "");
  return withoutApostrophes.replace(NOT_SLUG, "-").replace(/^-+|-+$/g, "");
}

/**
 * Recorta un slug a `max` puntos de código cortando en el último guion
 * anterior al tope; una única palabra más larga que el tope se corta tal cual.
 */
export function truncateSlug(slug: string, max: number): string {
  const codepoints = [...slug];
  if (codepoints.length <= max) return slug;
  const cut = codepoints.slice(0, max);
  if (codepoints[max] === "-") return cut.join("");
  const lastDash = cut.lastIndexOf("-");
  if (lastDash > 0) return cut.slice(0, lastDash).join("");
  return cut.join("");
}

/**
 * Segmento canónico: `<slug>-<id>`, o solo el id si el slug queda vacío. Si el
 * id no es un UUID (dato no canónico: fixtures de prueba, filas anómalas) se
 * devuelve tal cual en vez de fallar: el enlace no es canónico y la página
 * responderá 404, pero no se cae el render.
 */
export function buildSegment(slug: string, uuid: string): string {
  if (!UUID_REGEX.test(uuid)) return uuid;
  const id = encodeId(uuid);
  return slug ? `${slug}-${id}` : id;
}

export interface ParsedCatalogSegment {
  id: string;
  form: "encoded" | "legacy";
}

/**
 * Extrae el id de un segmento de catálogo. Acepta el UUID hexadecimal del
 * formato anterior (segmento entero) y el id base58 tras el último guion (o el
 * segmento entero si no hay guion). Cualquier otra forma es `null` (404).
 */
export function parseCatalogSegment(segment: string): ParsedCatalogSegment | null {
  if (UUID_REGEX.test(segment)) return { id: segment.toLowerCase(), form: "legacy" };
  const lastDash = segment.lastIndexOf("-");
  const token = lastDash === -1 ? segment : segment.slice(lastDash + 1);
  const id = decodeId(token);
  if (!id) return null;
  return { id, form: "encoded" };
}
