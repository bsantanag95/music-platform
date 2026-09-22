// Datos personales opcionales del perfil (spec profile-personal-info): país y
// pronombres de listas CERRADAS. Módulo puro (sin base de datos ni `next/*`) para
// que lo importen el esquema Zod, el servicio y los editores cliente. Se guardan
// claves estables (código de país, clave de pronombres); los nombres se generan por
// idioma (`Intl.DisplayNames` para los países) o viven en `messages/*/users.json`
// (pronombres), así agregar un país o un pronombre es cambiar código, no una
// migración.

// Códigos ISO 3166-1 alfa-2 oficiales (249) más `XK` (Kosovo, código de uso común
// que CLDR nombra). La prueba de este módulo exige que cada uno tenga nombre.
const ISO_CODES = `
AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ
BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ
DE DJ DK DM DO DZ
EC EE EG EH ER ES ET
FI FJ FK FM FO FR
GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY
HK HM HN HR HT HU
ID IE IL IM IN IO IQ IR IS IT
JE JM JO JP
KE KG KH KI KM KN KP KR KW KY KZ
LA LB LC LI LK LR LS LT LU LV LY
MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ
NA NC NE NF NG NI NL NO NP NR NU NZ
OM
PA PE PF PG PH PK PL PM PN PR PS PT PW PY
QA
RE RO RS RU RW
SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ
TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ
UA UG UM US UY UZ
VA VC VE VG VI VN VU
WF WS
XK
YE YT
ZA ZM ZW
`;

export const COUNTRIES: readonly string[] = ISO_CODES.trim().split(/\s+/);

const COUNTRY_SET: ReadonlySet<string> = new Set(COUNTRIES);

/** ¿Es un código de país de la lista? Distingue mayúsculas: `cl` y `Chile` no lo son. */
export function isValidCountry(value: unknown): value is string {
  return typeof value === "string" && COUNTRY_SET.has(value);
}

const displayNames = new Map<string, Intl.DisplayNames>();

function displayNamesFor(locale: string): Intl.DisplayNames {
  let names = displayNames.get(locale);
  if (!names) {
    names = new Intl.DisplayNames([locale], { type: "region" });
    displayNames.set(locale, names);
  }
  return names;
}

/** Nombre del país en el idioma dado ("CL" → "Chile"; "ES" → "España" / "Spain"). */
export function countryName(code: string, locale: string): string {
  return displayNamesFor(locale).of(code) ?? code;
}

export interface CountryOption {
  code: string;
  name: string;
}

/** Todos los países con su nombre en el idioma dado, ordenados alfabéticamente en él. */
export function countryOptions(locale: string): CountryOption[] {
  const collator = new Intl.Collator(locale);
  return COUNTRIES.map((code) => ({ code, name: countryName(code, locale) })).sort((a, b) =>
    collator.compare(a.name, b.name),
  );
}

// Pronombres de la lista cerrada. «Otro» no es una clave: es el texto libre de
// `app_user.pronouns` (hasta 40 caracteres). Se muestran «él», «ella» y «elle» en
// español y «he/him», «she/her» y «they/them» en inglés, según el idioma de quien
// mira (`users.pronounSet.<clave>`).
export const PRONOUN_SETS = ["he", "she", "they"] as const;
export type PronounSet = (typeof PRONOUN_SETS)[number];

export function isPronounSet(value: unknown): value is PronounSet {
  return typeof value === "string" && (PRONOUN_SETS as readonly string[]).includes(value);
}

/**
 * Lo que envía el cliente al editar los pronombres: una clave de la lista, `other`
 * (con el texto en `pronouns`) o `null` para no especificar ninguno.
 */
export type PronounChoice = PronounSet | "other" | null;

/**
 * Lo que `getProfileView` deja en lugar de los datos personales cuando quien mira no
 * tiene acceso a un perfil privado (spec profile-personal-info, "Visibilidad de los
 * datos personales según el acceso al perfil").
 */
export const EMPTY_PERSONAL_INFO = {
  country: null,
  location: null,
  pronouns: null,
  pronounSet: null,
} as const;
