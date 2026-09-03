import Image from "next/image";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";

// Muro de carátulas detrás del hero anónimo: cuadrícula tenue de sleeves
// reales (release-groups con arte), con el disco de vinilo como relleno
// cuando no hay suficiente arte. Es decorativo (`aria-hidden`) y se desvanece
// hacia los bordes con una máscara alfa radial, para fundirse con el ink de
// la página sin un borde duro. Las clases arbitrarias de máscara van
// literales (no interpoladas) para que las detecte el JIT de Tailwind.
const TILE_COUNT = 60;

export function HeroCoverWall({ covers }: { covers: string[] }) {
  // Reparte las carátulas con un paso coprimo para que, cuando hay pocas, las
  // repeticiones no queden pegadas en la cuadrícula.
  const tiles = Array.from({ length: TILE_COUNT }, (_, i) =>
    covers.length > 0 ? (covers[(i * 7) % covers.length] ?? null) : null,
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 grid grid-cols-4 gap-1 opacity-45 mask-[radial-gradient(ellipse_130%_100%_at_50%_45%,#000_42%,transparent_92%)] [-webkit-mask-image:radial-gradient(ellipse_130%_100%_at_50%_45%,#000_42%,transparent_92%)] sm:grid-cols-6 lg:grid-cols-8"
    >
      {tiles.map((url, i) => (
        <div key={i} className="relative aspect-square">
          {url ? (
            <Image
              src={url}
              alt=""
              fill
              sizes="12vw"
              className="object-cover"
            />
          ) : (
            <DiscPlaceholder alt="" className="h-full w-full" />
          )}
        </div>
      ))}
    </div>
  );
}
