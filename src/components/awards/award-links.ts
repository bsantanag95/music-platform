// Rutas de las páginas de premios (openspec: add-music-awards, design D5). Sin locale: el `Link` de next-intl lo
// agrega.

export function awardsIndexHref(): string {
  return "/awards";
}

export function ceremonyHref(awardSlug: string, year: number): string {
  return `/awards/${awardSlug}/${year}`;
}

export function categoryHistoryHref(awardSlug: string, key: string): string {
  return `/awards/${awardSlug}/categories/${key}`;
}
