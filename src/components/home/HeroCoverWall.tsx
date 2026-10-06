import { HERO_WALL } from "@/lib/config/hero-covers";

// Muro de carátulas detrás del hero anónimo: un único mosaico estático
// precompuesto (32 portadas fijas, ver `scripts/build-hero-wall.ts`), sin
// consulta a la base ni optimizador de imágenes: un solo request, de caché
// larga. Es decorativo (`aria-hidden`) y se desvanece hacia los bordes con una
// máscara alfa radial, para fundirse con el ink de la página sin un borde
// duro. Las clases arbitrarias de máscara van literales (no interpoladas)
// para que las detecte el JIT de Tailwind.
export function HeroCoverWall() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-45 mask-[radial-gradient(ellipse_130%_100%_at_50%_45%,#000_42%,transparent_92%)] [-webkit-mask-image:radial-gradient(ellipse_130%_100%_at_50%_45%,#000_42%,transparent_92%)]"
    >
      {/* `<img>` plano a propósito: el archivo ya está a su tamaño final, y así
          lleva `fetchPriority` desde el HTML (es el elemento más grande del
          primer viewport) sin pasar por /_next/image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HERO_WALL.src}
        alt=""
        width={HERO_WALL.cols * HERO_WALL.tile}
        height={HERO_WALL.rows * HERO_WALL.tile}
        fetchPriority="high"
        decoding="async"
        className="h-full w-full object-cover"
      />
    </div>
  );
}
