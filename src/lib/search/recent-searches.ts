// Búsquedas recientes del catálogo, por navegador. Es una conveniencia para
// re-encontrar una búsqueda ya hecha — NO un historial ni una métrica: sin
// conteos, sin sincronización entre dispositivos, sin página propia (respeta
// el principio "sin gamificación"). Vive en localStorage y toda lectura o
// escritura va protegida: una ventana privada, el storage lleno o
// deshabilitado devuelven una lista vacía sin romper la página.
//
// Desde la búsqueda por tipo (openspec: redesign-scoped-search) cada entrada
// guarda también el tipo. Las entradas antiguas (solo texto) se leen como
// búsquedas de Artistas, el tipo por defecto.

import type { SearchType } from "@/services/catalog/search/types";

const STORAGE_KEY = "mp:catalog-recent-searches";
const MAX_ENTRIES = 6;
const TYPES: readonly SearchType[] = ["artist", "album", "song", "user"];

export interface RecentSearch {
  q: string;
  type: SearchType;
}

function parseEntry(entry: unknown): RecentSearch | null {
  if (typeof entry === "string") {
    return entry.trim() ? { q: entry, type: "artist" } : null;
  }
  if (typeof entry !== "object" || entry === null) return null;
  const { q, type } = entry as { q?: unknown; type?: unknown };
  if (typeof q !== "string" || !q.trim()) return null;
  return { q, type: TYPES.includes(type as SearchType) ? (type as SearchType) : "artist" };
}

export function readRecentSearches(): RecentSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(parseEntry)
      .filter((entry): entry is RecentSearch => entry !== null)
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

function write(entries: RecentSearch[]): RecentSearch[] {
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

function sameSearch(a: RecentSearch, b: RecentSearch): boolean {
  return a.type === b.type && a.q.toLowerCase() === b.q.toLowerCase();
}

// Coloca la búsqueda al frente, quitando cualquier duplicado del mismo tipo
// sin distinguir mayúsculas. Devuelve la lista resultante para que el
// componente actualice su estado sin releer.
export function pushRecentSearch(query: string, type: SearchType = "artist"): RecentSearch[] {
  const normalized = query.trim();
  if (!normalized) return readRecentSearches();
  const entry = { q: normalized, type };
  return write([entry, ...readRecentSearches().filter((existing) => !sameSearch(existing, entry))]);
}

export function removeRecentSearch(search: RecentSearch): RecentSearch[] {
  return write(readRecentSearches().filter((existing) => !sameSearch(existing, search)));
}

export function clearRecentSearches(): RecentSearch[] {
  return write([]);
}
