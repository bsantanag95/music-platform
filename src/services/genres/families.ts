// Familias de géneros (openspec: add-genre-taxonomy, design D5). Módulo puro: lo usan el script
// que genera la taxonomía (`scripts/build-genre-taxonomy.ts`), las lecturas y los tests. Las
// familias son vocabulario del producto; la migración 0056 inserta las mismas 20 filas y sus
// nombres viven en `messages/*/genres.json`.

export const GENRE_FAMILIES = [
  { key: "rock", tier: "main" },
  { key: "metal", tier: "main" },
  { key: "punk", tier: "main" },
  { key: "pop", tier: "main" },
  { key: "electronic", tier: "main" },
  { key: "hip-hop", tier: "main" },
  { key: "rnb", tier: "main" },
  { key: "jazz", tier: "main" },
  { key: "blues", tier: "main" },
  { key: "folk", tier: "main" },
  { key: "country", tier: "main" },
  { key: "classical", tier: "main" },
  { key: "experimental", tier: "main" },
  { key: "ambient", tier: "main" },
  { key: "caribbean", tier: "main" },
  { key: "latin", tier: "main" },
  { key: "brazilian", tier: "main" },
  { key: "spoken", tier: "more" },
  { key: "religious", tier: "more" },
  { key: "world", tier: "more" },
] as const;

export type FamilyKey = (typeof GENRE_FAMILIES)[number]["key"];
export type FamilyTier = (typeof GENRE_FAMILIES)[number]["tier"];

export const FAMILY_KEYS: readonly FamilyKey[] = GENRE_FAMILIES.map((f) => f.key);

/** Familia de los géneros que ninguna regla asigna. */
export const DEFAULT_FAMILY: FamilyKey = "world";

export function isFamilyKey(value: string): value is FamilyKey {
  return (FAMILY_KEYS as readonly string[]).includes(value);
}

/**
 * Curaduría versionada (`data/genres/curation.ts`). Todas las claves son nombres de género de
 * MusicBrainz tal como figuran en el dump; el build falla si alguno no existe.
 */
export interface GenreCuration {
  /** Raíz del árbol "subgénero de" → familias de todo su subárbol. */
  roots: Record<string, FamilyKey[]>;
  /**
   * Familias culturales que cruzan ramas: un género suma la familia si él o un ancestro está en
   * la lista (p. ej. "trap latino", bajo hip hop, también es Latina).
   */
  cultural: Partial<Record<FamilyKey, string[]>>;
  /** Asignación explícita: gana sobre todas las reglas del árbol (huérfanos y excepciones). */
  overrides: Record<string, FamilyKey[]>;
  /** Descriptores: no son estilos ni tienen familia (Instrumental, Navideña, Orquestal). */
  descriptors: string[];
  /** Ocultos: nunca se muestran ni cuentan. */
  hidden: string[];
  /**
   * Corrección editorial del nombre en español cuando la etiqueta de Wikidata enlazada por P8052
   * es de otro concepto (p. ej. "classical" → ítem "música culta"). No es traducción automática.
   */
  namesEs: Record<string, string>;
}

export type TaxonomyKind = "style" | "descriptor" | "hidden";

/** Nodo mínimo del grafo para calcular familias, identificado por nombre de MusicBrainz. */
export interface GenreNode {
  name: string;
  /** Nombres de los géneros de los que es subgénero. */
  parents: string[];
  /** Nombres de los géneros de los que es fusión. */
  fusionOf: string[];
}

export interface FamilyAssignment {
  kind: TaxonomyKind;
  /** Familias en el orden de `GENRE_FAMILIES`; vacío para descriptores y ocultos. */
  families: FamilyKey[];
  /** Regla que decidió la pertenencia (para el reporte del build y los tests). */
  rule: "hidden" | "descriptor" | "override" | "tree" | "fusion" | "default";
}

function sortFamilies(families: Iterable<FamilyKey>): FamilyKey[] {
  const set = new Set(families);
  return FAMILY_KEYS.filter((key) => set.has(key));
}

/**
 * Calcula clase y familias de cada género (design D5), en este orden: oculto/descriptor →
 * asignación curada → raíces por "subgénero de" (unión) + familias culturales del subárbol →
 * familias de los géneros de los que es "fusión de" → `world`.
 */
export function assignFamilies(nodes: GenreNode[], curation: GenreCuration): Map<string, FamilyAssignment> {
  const byName = new Map(nodes.map((n) => [n.name, n]));
  const hidden = new Set(curation.hidden);
  const descriptors = new Set(curation.descriptors);
  const culturalByGenre = new Map<string, FamilyKey[]>();
  for (const [family, names] of Object.entries(curation.cultural) as [FamilyKey, string[]][]) {
    for (const name of names) culturalByGenre.set(name, [...(culturalByGenre.get(name) ?? []), family]);
  }

  /** El propio género y todos sus ancestros por "subgénero de" (tolera ciclos). */
  function lineage(name: string): Set<string> {
    const seen = new Set<string>([name]);
    const stack = [name];
    while (stack.length > 0) {
      const current = stack.pop()!;
      for (const parent of byName.get(current)?.parents ?? []) {
        if (!seen.has(parent)) {
          seen.add(parent);
          stack.push(parent);
        }
      }
    }
    return seen;
  }

  /** Familias por árbol: raíces mapeadas + familias culturales de la línea. */
  function treeFamilies(name: string): FamilyKey[] {
    const families: FamilyKey[] = [];
    for (const ancestor of lineage(name)) {
      const node = byName.get(ancestor);
      const isRoot = !node || node.parents.length === 0;
      if (isRoot) families.push(...(curation.roots[ancestor] ?? []));
      families.push(...(culturalByGenre.get(ancestor) ?? []));
    }
    return sortFamilies(families);
  }

  /** Familias "directas" de un componente de fusión: curadas o por árbol, sin volver a fusionar. */
  function componentFamilies(name: string): FamilyKey[] {
    if (hidden.has(name) || descriptors.has(name)) return [];
    return curation.overrides[name] ?? treeFamilies(name);
  }

  const result = new Map<string, FamilyAssignment>();
  for (const node of nodes) {
    const { name } = node;
    if (hidden.has(name)) {
      result.set(name, { kind: "hidden", families: [], rule: "hidden" });
      continue;
    }
    if (descriptors.has(name)) {
      result.set(name, { kind: "descriptor", families: [], rule: "descriptor" });
      continue;
    }
    const override = curation.overrides[name];
    if (override) {
      result.set(name, { kind: "style", families: sortFamilies(override), rule: "override" });
      continue;
    }
    const tree = treeFamilies(name);
    if (tree.length > 0) {
      result.set(name, { kind: "style", families: tree, rule: "tree" });
      continue;
    }
    const fusion = sortFamilies(node.fusionOf.flatMap(componentFamilies));
    if (fusion.length > 0) {
      result.set(name, { kind: "style", families: fusion, rule: "fusion" });
      continue;
    }
    result.set(name, { kind: "style", families: [DEFAULT_FAMILY], rule: "default" });
  }
  return result;
}

/**
 * Errores de una curaduría contra el grafo: nombres inexistentes (MusicBrainz renombró o borró un
 * género), raíces que dejaron de serlo y nombres repetidos entre descriptores y ocultos.
 */
export function validateCuration(nodes: GenreNode[], curation: GenreCuration): string[] {
  const byName = new Map(nodes.map((n) => [n.name, n]));
  const errors: string[] = [];
  const check = (section: string, name: string) => {
    if (!byName.has(name)) errors.push(`${section}: "${name}" no existe en MusicBrainz`);
  };
  for (const name of Object.keys(curation.roots)) {
    check("roots", name);
    const node = byName.get(name);
    if (node && node.parents.length > 0) errors.push(`roots: "${name}" ya no es raíz (subgénero de ${node.parents.join(", ")})`);
  }
  for (const [family, names] of Object.entries(curation.cultural)) {
    if (!isFamilyKey(family)) errors.push(`cultural: familia desconocida "${family}"`);
    for (const name of names ?? []) check(`cultural.${family}`, name);
  }
  for (const name of Object.keys(curation.overrides)) check("overrides", name);
  for (const [name, label] of Object.entries(curation.namesEs)) {
    check("namesEs", name);
    if (!label.trim()) errors.push(`namesEs: "${name}" tiene un nombre vacío`);
  }
  for (const name of curation.descriptors) check("descriptors", name);
  for (const name of curation.hidden) {
    check("hidden", name);
    if (curation.descriptors.includes(name)) errors.push(`"${name}" es descriptor y oculto a la vez`);
  }
  const familyLists = [
    ...Object.values(curation.roots),
    ...Object.values(curation.overrides),
  ];
  for (const list of familyLists) {
    for (const family of list) if (!isFamilyKey(family)) errors.push(`familia desconocida "${family}"`);
  }
  return errors;
}

/** Familias principales sin ningún género asignado (el build falla si hay alguna). */
export function emptyMainFamilies(assignments: Map<string, FamilyAssignment>): FamilyKey[] {
  const used = new Set<FamilyKey>();
  for (const a of assignments.values()) for (const f of a.families) used.add(f);
  return GENRE_FAMILIES.filter((f) => f.tier === "main" && !used.has(f.key)).map((f) => f.key);
}
