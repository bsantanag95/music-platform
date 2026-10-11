import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  CategoriesFileSchema,
  CeremonyFileSchema,
  validateCategories,
  validateCeremony,
  type CategoriesFile,
  type CeremonyFile,
} from "./curation-schema";

// Lectura de los archivos de curaduría de `data/awards/` (openspec: add-music-awards, ADR 0032). Un premio es una
// carpeta con `categories.json` y `ceremonies/<año>.json`. La lectura nunca lanza por un archivo inválido: junta
// todos los errores para que el curador los corrija de una vez y para que la carga aborte sin escribir.

export const AWARDS_DATA_DIR = join(process.cwd(), "data", "awards");

export interface CeremonyEntry {
  path: string;
  fileName: string;
  data: CeremonyFile;
}

export interface AwardFiles {
  slug: string;
  categories: CategoriesFile;
  ceremonies: CeremonyEntry[];
}

export interface ReadResult {
  awards: AwardFiles[];
  errors: string[];
}

function formatZodError(fileName: string, error: { issues: { path: PropertyKey[]; message: string }[] }): string[] {
  return error.issues.map((issue) => `${fileName}: ${issue.path.map(String).join(".") || "(raíz)"} — ${issue.message}`);
}

function readJson(path: string, fileName: string, errors: string[]): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    errors.push(`${fileName}: no es JSON válido (${error instanceof Error ? error.message : String(error)})`);
    return undefined;
  }
}

/** Lee y valida un premio (`data/awards/<slug>/`). Las ceremonias se devuelven en orden de año. */
export function readAward(awardDir: string, slug: string): { award: AwardFiles | null; errors: string[] } {
  const errors: string[] = [];
  const categoriesName = `${slug}/categories.json`;
  const rawCategories = readJson(join(awardDir, "categories.json"), categoriesName, errors);
  if (rawCategories === undefined) return { award: null, errors };
  const categories = CategoriesFileSchema.safeParse(rawCategories);
  if (!categories.success) return { award: null, errors: formatZodError(categoriesName, categories.error) };
  errors.push(...validateCategories(categories.data, categoriesName));
  if (categories.data.award !== slug) {
    errors.push(`${categoriesName}: "award" es "${categories.data.award}" pero la carpeta es "${slug}"`);
  }

  const ceremoniesDir = join(awardDir, "ceremonies");
  const ceremonyFiles = existsSync(ceremoniesDir)
    ? readdirSync(ceremoniesDir).filter((f) => f.endsWith(".json")).sort()
    : [];
  const ceremonies: CeremonyEntry[] = [];
  for (const file of ceremonyFiles) {
    const fileName = `${slug}/ceremonies/${file}`;
    const path = join(ceremoniesDir, file);
    const raw = readJson(path, fileName, errors);
    if (raw === undefined) continue;
    const parsed = CeremonyFileSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push(...formatZodError(fileName, parsed.error));
      continue;
    }
    if (file !== `${parsed.data.year}.json`) errors.push(`${fileName}: el archivo debería llamarse ${parsed.data.year}.json`);
    errors.push(...validateCeremony(parsed.data, categories.data, fileName));
    ceremonies.push({ path, fileName, data: parsed.data });
  }
  const editions = new Map<number, string>();
  for (const { fileName, data } of ceremonies) {
    const other = editions.get(data.edition);
    if (other) errors.push(`${fileName}: la edición ${data.edition} ya la usa ${other}`);
    editions.set(data.edition, fileName);
  }
  ceremonies.sort((a, b) => a.data.year - b.data.year);
  return { award: { slug, categories: categories.data, ceremonies }, errors };
}

/** Lee todos los premios de `dir` (por omisión `data/awards/`). */
export function readAllAwards(dir: string = AWARDS_DATA_DIR): ReadResult {
  if (!existsSync(dir)) return { awards: [], errors: [] };
  const awards: AwardFiles[] = [];
  const errors: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const result = readAward(join(dir, entry.name), entry.name);
    errors.push(...result.errors);
    if (result.award) awards.push(result.award);
  }
  awards.sort((a, b) => a.slug.localeCompare(b.slug));
  return { awards, errors };
}

/** Reescribe un archivo de ceremonia (lo usa la resolución), con formato estable para revisar el diff. */
export function writeCeremony(path: string, data: CeremonyFile): void {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
