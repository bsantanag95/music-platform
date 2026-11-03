// Búsquedas avanzadas recientes, por navegador (openspec: refine-advanced-search-phase2, design D5). Igual que las
// recientes de /search (`recent-searches.ts`): una conveniencia para volver a una búsqueda, no un historial; vive en
// localStorage y toda lectura o escritura va protegida (ventana privada, storage lleno o deshabilitado → lista vacía).
// Cada entrada es el `href` de la búsqueda (`/search/advanced?type=…`), así guarda todos sus criterios.

const STORAGE_KEY = "mp:advanced-recent-searches";
const MAX_ENTRIES = 5;
const PREFIX = "/search/advanced?";

function isEntry(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(PREFIX) && value.length < 2000;
}

export function readRecentAdvancedSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isEntry).slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

function write(entries: string[]): string[] {
  const next = entries.slice(0, MAX_ENTRIES);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage lleno o deshabilitado: la búsqueda ya funcionó.
    }
  }
  return next;
}

/** Coloca la búsqueda al frente, sin repetirla. */
export function pushRecentAdvancedSearch(href: string): string[] {
  if (!isEntry(href)) return readRecentAdvancedSearches();
  return write([href, ...readRecentAdvancedSearches().filter((entry) => entry !== href)]);
}

export function removeRecentAdvancedSearch(href: string): string[] {
  return write(readRecentAdvancedSearches().filter((entry) => entry !== href));
}
