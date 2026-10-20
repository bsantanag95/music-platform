// Rutas de las páginas de premios (openspec: add-music-awards, design D5). Sin locale: el `Link` de next-intl lo
// agrega.

export function awardsIndexHref(): string {
  return "/awards";
}

/** Página de un premio: redirige a su ceremonia más reciente (openspec: redesign-awards-pages). */
export function awardHref(awardSlug: string): string {
  return `/awards/${awardSlug}`;
}

export function ceremonyHref(awardSlug: string, year: number): string {
  return `/awards/${awardSlug}/${year}`;
}

// Salones de la fama (openspec: add-hall-of-fame-page, design D4): su propio índice y sus clases, aparte de los premios.
export function hallOfFameIndexHref(): string {
  return "/hall-of-fame";
}

/** Página de un salón: redirige a su clase más reciente. */
export function hallHref(hallSlug: string): string {
  return `/hall-of-fame/${hallSlug}`;
}

export function hallClassHref(hallSlug: string, year: number): string {
  return `/hall-of-fame/${hallSlug}/${year}`;
}

export function categoryHistoryHref(awardSlug: string, key: string): string {
  return `/awards/${awardSlug}/categories/${key}`;
}
