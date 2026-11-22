// Fecha corta de lanzamiento: día y mes ("12 sept"), con el año solo cuando no
// es el actual — alrededor de hoy el día importa más que el año. Compartida por
// el riel (`ReleaseRail`, cliente) y el horario (`ReleaseTimetable`, servidor).
export function formatReleaseDate(iso: string, locale: string, now: Date = new Date()) {
  const date = new Date(`${iso}T00:00:00`);
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}
