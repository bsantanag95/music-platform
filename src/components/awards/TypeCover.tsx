// Portada tipográfica de una incorporación sin carátula (openspec: polish-hall-of-fame-page): la inicial del título en grande sobre un
// fondo con un tono propio. En los salones de la fama muchas grabaciones antiguas no tienen carátula (o no tienen ficha en el
// catálogo) y el riel salía lleno de discos grises de 240 px: con un tono por título y la inicial, la tarjeta se lee como hecha a
// propósito, no como una imagen rota. Decorativa: el título y el artista ya están debajo, en texto.

/** Tonos de fondo, todos del sistema y apagados: la variación distingue tarjetas vecinas sin competir con las carátulas reales. */
const TONES = [
  "from-petrol/35 to-ink",
  "from-paper-muted/20 to-ink",
  "from-petrol/20 to-ink-surface",
  "from-amber/15 to-ink",
] as const;

/** Tono estable para un título: el mismo disco tiene siempre el mismo fondo, en cualquier página. */
export function typeCoverTone(title: string): (typeof TONES)[number] {
  let hash = 0;
  for (const char of title) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return TONES[hash % TONES.length]!;
}

/** Primera letra o número del título (sin comillas ni signos iniciales); un título sin ninguna, el símbolo de grabación. */
export function typeCoverInitial(title: string): string {
  const match = title.match(/[\p{L}\p{N}]/u);
  return match ? match[0].toLocaleUpperCase() : "℗";
}

export function TypeCover({ title, className = "" }: { title: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded bg-gradient-to-br ring-1 ring-inset ring-ink-border [container-type:inline-size] ${typeCoverTone(title)} ${className}`}
    >
      <span className="font-display text-[clamp(1.5rem,40cqw,6rem)] leading-none text-paper/70">
        {typeCoverInitial(title)}
      </span>
    </span>
  );
}
