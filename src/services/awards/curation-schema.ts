import { z } from "zod";
import { ReleaseGroupCategorySchema } from "@/lib/api/schemas";
import { AWARD_CATEGORY_TIERS, AWARD_COVERAGES, AWARD_HONORS, AWARD_SUBJECT_KINDS } from "@/db/schema";

// Formato de los archivos de curaduría de premios (`data/awards/<premio>/`, openspec: add-music-awards, ADR 0032).
// Lo comparten el script de resolución, el de carga y la prueba que valida los archivos en CI. Las reglas que
// cruzan archivos (la categoría existe, el sujeto coincide, `winner_only` solo con ganadores) viven en
// `validateCeremony`, que devuelve los errores con archivo y categoría en vez de lanzar el primero.

/** Los Grammy tienen cinco nominados por categoría (ocho en las grandes); menos de tres no es una lista completa. */
export const MIN_COMPLETE_NOMINEES = 3;

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "debe ser un slug en minúsculas con guiones");
const mbid = z.uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "debe ser una fecha AAAA-MM-DD");

/** Crédito de artista tal como lo devuelve MusicBrainz (`artist-credit`). */
const ArtistCreditSchema = z.object({
  name: z.string().min(1),
  joinphrase: z.string().optional(),
  artist: z.object({ id: mbid, name: z.string().min(1) }),
});

// Semilla mínima para crear la fila del catálogo sin consultar MusicBrainz al cargar.
export const ReleaseGroupSeedSchema = z.object({
  kind: z.literal("release_group"),
  title: z.string().min(1),
  category: ReleaseGroupCategorySchema,
  firstReleaseDate: z.string().optional(),
  credits: z.array(ArtistCreditSchema),
});
const RecordingSeedSchema = z.object({
  kind: z.literal("recording"),
  title: z.string().min(1),
  durationSec: z.number().int().nonnegative().nullable(),
  credits: z.array(ArtistCreditSchema),
  /** Disco ancla donde se encontró: la carga lo crea como stub y de él salen la carátula y el enlace. */
  anchorMbid: mbid.optional(),
  anchor: ReleaseGroupSeedSchema.optional(),
});
const ArtistSeedSchema = z.object({
  kind: z.literal("artist"),
  name: z.string().min(1),
  mbType: z.string().optional(),
  disambiguation: z.string().nullable().optional(),
});
export const NomineeSeedSchema = z.discriminatedUnion("kind", [
  ReleaseGroupSeedSchema,
  RecordingSeedSchema,
  ArtistSeedSchema,
]);
export type NomineeSeed = z.infer<typeof NomineeSeedSchema>;

export const RESOLUTION_STATUSES = ["exact", "manual", "ambiguous", "not_found"] as const;
export type ResolutionStatus = (typeof RESOLUTION_STATUSES)[number];

const CandidateSchema = z.object({
  mbid,
  label: z.string(),
  score: z.number(),
  seed: NomineeSeedSchema,
});
export type ResolutionCandidate = z.infer<typeof CandidateSchema>;

/**
 * Lo escribe el script de resolución. `exact`: único candidato válido. `manual`: el curador eligió entre los
 * candidatos de un `ambiguous` (copia su `mbid` y `seed`). `ambiguous` y `not_found` se cargan como texto.
 */
export const ResolutionSchema = z.object({
  status: z.enum(RESOLUTION_STATUSES),
  mbid: mbid.optional(),
  seed: NomineeSeedSchema.optional(),
  candidates: z.array(CandidateSchema).optional(),
});
export type Resolution = z.infer<typeof ResolutionSchema>;

const WorkRefSchema = z.object({ title: z.string().min(1), artist: z.string().min(1) });

export const NomineeSchema = z.object({
  /** Título del álbum o la grabación, o el nombre del artista en categorías de artista. */
  title: z.string().min(1),
  /** Artista acreditado (no se usa en categorías de artista). */
  artist: z.string().min(1).optional(),
  /** Disco donde aparece la grabación: obligatorio en categorías de grabación (ADR 0032, punto 3). */
  anchor: WorkRefSchema.optional(),
  /**
   * Cómo buscarlo cuando el texto oficial no coincide con MusicBrainz ("Justice (Triple Chucks Deluxe)" → "Justice";
   * "Tony Bennett & Lady Gaga" → "Tony Bennett"). Solo afecta la búsqueda; lo visible sigue siendo `title`/`artist`.
   */
  searchAs: z.object({ title: z.string().min(1).optional(), artist: z.string().min(1).optional() }).optional(),
  won: z.boolean(),
  /** Productores, compositores u otros créditos, tal como los nombra la fuente. */
  credits: z.string().min(1).optional(),
  resolved: ResolutionSchema.optional(),
});
export type Nominee = z.infer<typeof NomineeSchema>;

export const CeremonyCategorySchema = z.object({
  key: slug,
  coverage: z.enum(AWARD_COVERAGES),
  nominees: z.array(NomineeSchema).min(1),
});

export const CeremonyFileSchema = z.object({
  award: slug,
  year: z.number().int().min(1900).max(2100),
  edition: z.number().int().positive(),
  heldOn: isoDate,
  /** Fuente contra la que se revisó la ceremonia (Wikipedia o el sitio oficial). */
  sourceUrl: z.url(),
  categories: z.array(CeremonyCategorySchema).min(1),
});
export type CeremonyFile = z.infer<typeof CeremonyFileSchema>;

export const CategoryDefinitionSchema = z.object({
  key: slug,
  tier: z.enum(AWARD_CATEGORY_TIERS),
  subject: z.enum(AWARD_SUBJECT_KINDS),
  honors: z.enum(AWARD_HONORS).default("performer"),
  /** Campo (pop, rock-alternative…): obligatorio en el nivel `genre`, que agrupa por él; no se usa en los demás. */
  field: slug.optional(),
  name: z.object({ es: z.string().min(1), en: z.string().min(1) }),
  /** Clave de la categoría anterior cuando esta la renombra, fusiona o divide. */
  predecessor: slug.optional(),
  order: z.number().int().nonnegative(),
});
export type CategoryDefinition = z.infer<typeof CategoryDefinitionSchema>;

export const CategoriesFileSchema = z.object({
  award: slug,
  categories: z.array(CategoryDefinitionSchema).min(1),
});
export type CategoriesFile = z.infer<typeof CategoriesFileSchema>;

/** Texto visible de un nominado: "Título — Artista", o solo el nombre en categorías de artista. */
export function nomineeText(nominee: Nominee): string {
  return nominee.artist ? `${nominee.title} — ${nominee.artist}` : nominee.title;
}

/** El nominado entra enlazado al catálogo: resolución exacta o elegida por el curador, con su semilla. */
export function isLinkable(resolved: Resolution | undefined): resolved is Resolution & { mbid: string; seed: NomineeSeed } {
  return (
    resolved !== undefined &&
    (resolved.status === "exact" || resolved.status === "manual") &&
    resolved.mbid !== undefined &&
    resolved.seed !== undefined
  );
}

/** Reglas propias de las categorías: claves únicas, predecesoras existentes y campos coherentes con el nivel. */
export function validateCategories(file: CategoriesFile, fileName: string): string[] {
  const errors: string[] = [];
  const keys = new Set<string>();
  for (const category of file.categories) {
    if (keys.has(category.key)) errors.push(`${fileName}: la categoría "${category.key}" está repetida`);
    keys.add(category.key);
  }
  for (const category of file.categories) {
    if (category.tier === "genre" && !category.field) {
      errors.push(`${fileName}: la categoría "${category.key}" es de nivel genre y necesita "field"`);
    }
    if (category.tier !== "genre" && category.field) {
      errors.push(`${fileName}: "field" solo se usa en el nivel genre ("${category.key}" es ${category.tier})`);
    }
  }
  // La página agrupa por campo recorriendo las categorías en su orden curado: un campo partido en dos saldría
  // como dos grupos con el mismo subtítulo.
  const byOrder = [...file.categories].filter((c) => c.field).sort((a, b) => a.order - b.order);
  const closed = new Set<string>();
  let current: string | undefined;
  for (const category of byOrder) {
    if (category.field === current) continue;
    if (closed.has(category.field!)) {
      errors.push(`${fileName}: las categorías del campo "${category.field}" no son contiguas en "order"`);
    }
    if (current) closed.add(current);
    current = category.field;
  }
  for (const category of file.categories) {
    if (!category.predecessor) continue;
    if (category.predecessor === category.key) {
      errors.push(`${fileName}: "${category.key}" no puede ser su propia predecesora`);
    } else if (!keys.has(category.predecessor)) {
      errors.push(`${fileName}: la predecesora "${category.predecessor}" de "${category.key}" no existe`);
    }
  }
  return errors;
}

/**
 * Reglas que cruzan la ceremonia con las categorías. Devuelve todos los errores con archivo y categoría; una lista
 * vacía significa que la ceremonia se puede cargar.
 */
export function validateCeremony(ceremony: CeremonyFile, categories: CategoriesFile, fileName: string): string[] {
  const errors: string[] = [];
  const at = (key: string) => `${fileName} › ${key}`;
  if (ceremony.award !== categories.award) {
    errors.push(`${fileName}: el premio "${ceremony.award}" no coincide con el de las categorías ("${categories.award}")`);
  }
  if (Number(ceremony.heldOn.slice(0, 4)) !== ceremony.year) {
    errors.push(`${fileName}: la fecha ${ceremony.heldOn} no es del año ${ceremony.year}`);
  }
  const definitions = new Map(categories.categories.map((c) => [c.key, c]));
  const seen = new Set<string>();
  for (const category of ceremony.categories) {
    if (seen.has(category.key)) errors.push(`${at(category.key)}: la categoría está repetida en la ceremonia`);
    seen.add(category.key);
    const definition = definitions.get(category.key);
    if (!definition) {
      errors.push(`${at(category.key)}: la categoría no existe en categories.json`);
      continue;
    }
    if (!category.nominees.some((n) => n.won)) errors.push(`${at(category.key)}: no tiene ganador`);
    if (category.coverage === "complete" && category.nominees.length < MIN_COMPLETE_NOMINEES) {
      errors.push(
        `${at(category.key)}: la cobertura es complete pero hay ${category.nominees.length} nominados (mínimo ${MIN_COMPLETE_NOMINEES})`,
      );
    }
    if (category.coverage === "winner_only" && category.nominees.some((n) => !n.won)) {
      errors.push(`${at(category.key)}: la cobertura es winner_only pero hay nominados que no ganaron`);
    }
    category.nominees.forEach((nominee, index) => {
      const where = `${at(category.key)} #${index + 1} (${nomineeText(nominee)})`;
      if (definition.subject === "artist" && nominee.artist) {
        errors.push(`${where}: en una categoría de artista no va "artist"`);
      }
      if (definition.subject !== "artist" && !nominee.artist) {
        errors.push(`${where}: falta "artist"`);
      }
      if (definition.subject === "recording" && !nominee.anchor) {
        errors.push(`${where}: una categoría de grabación exige "anchor" (el disco donde aparece)`);
      }
      const resolved = nominee.resolved;
      if (resolved && (resolved.status === "exact" || resolved.status === "manual")) {
        if (!resolved.mbid || !resolved.seed) {
          errors.push(`${where}: una resolución "${resolved.status}" necesita "mbid" y "seed"`);
        } else if (resolved.seed.kind !== definition.subject) {
          errors.push(`${where}: la semilla es de tipo "${resolved.seed.kind}" y la categoría premia "${definition.subject}"`);
        }
      }
    });
  }
  return errors;
}
