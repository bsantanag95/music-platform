// Orden compartido, del lado del cliente, entre el modal de inicio
// (`ArtistJourneyStartModal`) y la vista de selección de la página de
// gestión (`ArtistJourneySelectionView`): mismo criterio que
// `sortDiscographyByYear` del servicio — año ascendente, sin año al final,
// alfabético de desempate. Copia de cliente porque el servicio vive en un
// módulo server-only (importa `db`), mismo trade-off que ya acepta
// `AlbumGrid`.
export function sortByYear<T extends { title: string; firstReleaseYear: number | null }>(
  albums: T[],
): T[] {
  return [...albums].sort((a, b) => {
    if (a.firstReleaseYear === null && b.firstReleaseYear === null) {
      return a.title.localeCompare(b.title);
    }
    if (a.firstReleaseYear === null) return 1;
    if (b.firstReleaseYear === null) return -1;
    return a.firstReleaseYear - b.firstReleaseYear || a.title.localeCompare(b.title);
  });
}

// Alfabético, sin distinguir mayúsculas — orden alternativo de la vista de
// selección (Requirement "Vista de la selección actual con carátulas, orden
// y enlaces").
export function sortAlphabetically<T extends { title: string }>(albums: T[]): T[] {
  return [...albums].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
  );
}
