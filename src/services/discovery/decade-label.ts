// Nombre de una década en cada idioma (openspec: redesign-decade-view). En español se dice "Años 80", no "1980s": de 1920 a 1990
// va con dos cifras y el resto con cuatro ("Años 1890", "Años 1900", "Años 1910", "Años 2000", "Años 2020"), porque "Años 00",
// "Años 10" o "Años 20" se leen como los 2000, 2010 o 2020 y los 1890s y los 1990s compartirían nombre. "Años 20" es, en cambio,
// la expresión corriente para 1920 ("los felices años 20"), y los 2020 van con cuatro cifras, así que no chocan. En inglés es `1980s`.

/** `decade` es el año de inicio (1980). `locale` es el idioma activo de la interfaz (`es`, `en`). */
export function decadeLabel(decade: number, locale: string): string {
  if (locale.startsWith("es")) {
    return decade >= 1920 && decade < 2000 ? `Años ${decade - 1900}` : `Años ${decade}`;
  }
  return `${decade}s`;
}
