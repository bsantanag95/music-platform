// Cover Art Archive — ver docs/03-data/data-licensing.md.
// Las carátulas son copyright de las disqueras, no CC0. Decisión de
// producto: usar siempre la miniatura de 250px (front-250), nunca la
// imagen a resolución completa, siguiendo la misma práctica que Wikipedia
// para portadas de álbum (fines de identificación, no decorativos).

export function coverThumbUrl(releaseMbid: string): string {
  return `https://coverartarchive.org/release/${releaseMbid}/front-250`;
}
