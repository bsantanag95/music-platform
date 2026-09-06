// Búsquedas recientes del catálogo, por navegador. Es una conveniencia para
// re-encontrar una búsqueda ya hecha — NO un historial ni una métrica: sin
// conteos, sin sincronización entre dispositivos, sin página propia (respeta
// el principio "sin gamificación"). Vive en localStorage y toda lectura o
// escritura va protegida: una ventana privada, el storage lleno o
// deshabilitado devuelven una lista vacía sin romper la página.

const STORAGE_KEY = "mp:catalog-recent-searches";
const MAX_ENTRIES = 6;

export function readRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
      .slice(0, MAX_ENTRIES);
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
      // Storage lleno o deshabilitado: la búsqueda ya funcionó, no es un
      // fallo que deba verse.
    }
  }
  return next;
}

// Coloca `query` al frente, quitando cualquier duplicado sin distinguir
// mayúsculas. Devuelve la lista resultante para que el componente actualice
// su estado sin releer.
export function pushRecentSearch(query: string): string[] {
  const normalized = query.trim();
  if (!normalized) return readRecentSearches();
  const rest = readRecentSearches().filter(
    (entry) => entry.toLowerCase() !== normalized.toLowerCase(),
  );
  return write([normalized, ...rest]);
}

export function removeRecentSearch(query: string): string[] {
  return write(
    readRecentSearches().filter(
      (entry) => entry.toLowerCase() !== query.toLowerCase(),
    ),
  );
}

export function clearRecentSearches(): string[] {
  return write([]);
}
