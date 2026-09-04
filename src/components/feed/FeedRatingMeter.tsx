interface FeedRatingMeterProps {
  // Estrellas como las devuelve el servicio: "0.5" .. "5.0".
  stars: string;
  detailedScore: number | null;
  // aria-label ya localizada (la arma el caller, que tiene el catálogo).
  label: string;
}

const SEGMENTS = [0, 1, 2, 3, 4];

// Lenguaje visual propio del rating en el feed: una escalera de cinco marcas
// tipo escala de aguja de VU meter —crecientes hacia el extremo "caliente"—
// encendidas en ámbar hasta el valor, con media marca para el `.5`. Va SIEMPRE
// con el número al lado: la marca es refuerzo, no la única señal (a diferencia
// de las estrellas, que el usuario ya sabe leer). Es el único uso de ámbar en
// reposo del feed (Regla de Rareza — ver DESIGN.md). Componente display-only.
export function FeedRatingMeter({ stars, detailedScore, label }: FeedRatingMeterProps) {
  const value = Number(stars);
  const numeric = detailedScore != null ? `${stars} · ${detailedScore}` : stars;

  return (
    <span
      className="mt-1 inline-flex items-center gap-2 font-data text-xs"
      aria-label={label}
      role="img"
    >
      <span aria-hidden className="flex items-end gap-[3px]">
        {SEGMENTS.map((i) => {
          const fill = Math.max(0, Math.min(1, value - i));
          return (
            <span
              key={i}
              className="relative w-[3px] shrink-0 overflow-hidden bg-ink-border"
              style={{ height: `${8 + i * 2}px` }}
            >
              {fill > 0 ? (
                <span
                  className="absolute inset-y-0 left-0 bg-amber"
                  style={{ width: `${fill * 100}%` }}
                />
              ) : null}
            </span>
          );
        })}
      </span>
      <span aria-hidden className="text-amber">
        {numeric}
      </span>
    </span>
  );
}
