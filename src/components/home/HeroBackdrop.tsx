import { AppImage } from "@/components/ui/AppImage";
import { HERO_WALL, heroWallTilePosition } from "@/lib/config/hero-covers";
import type { HomeBackdropAlbum } from "@/services/home/home";

/** Por debajo de esta cantidad de álbumes con carátula, el fondo es el mosaico general entero. */
export const BACKDROP_MIN = 6;

/** Columnas que la máscara deja ver (de la más visible a la menos): ahí van las carátulas propias. */
const VISIBLE_COLUMNS = [7, 6, 5, 4, 3] as const;

/**
 * Celdas del mosaico (índice fila × 8 + columna) en el orden en que reciben las carátulas propias: de la
 * columna de la derecha hacia la izquierda y, en cada una, de arriba abajo. Como mucho 20 celdas.
 */
export const PERSONAL_CELLS: readonly number[] = VISIBLE_COLUMNS.flatMap((col) =>
  Array.from({ length: HERO_WALL.rows }, (_, row) => row * HERO_WALL.cols + col),
);

// Opacidad baja y desvanecido hacia el titular; por debajo de `lg` el titular cae sobre más fondo, así que la
// máscara empieza más a la derecha y la opacidad baja un poco.
const LAYER_CLASS =
  "pointer-events-none absolute inset-0 opacity-[0.09] [-webkit-mask-image:linear-gradient(90deg,transparent_55%,#000_98%)] [mask-image:linear-gradient(90deg,transparent_55%,#000_98%)] lg:opacity-[0.12] lg:[-webkit-mask-image:linear-gradient(90deg,transparent_35%,#000_95%)] lg:[mask-image:linear-gradient(90deg,transparent_35%,#000_95%)]";

function wallTile(index: number) {
  return {
    backgroundImage: `url(${HERO_WALL.src})`,
    backgroundSize: `${HERO_WALL.cols * 100}% ${HERO_WALL.rows * 100}%`,
    backgroundPosition: heroWallTilePosition(index),
  };
}

// Fondo de la cabecera del Inicio con sesión (openspec: personalize-signed-in-hero-backdrop): con al menos
// `BACKDROP_MIN` álbumes de la persona (favoritos y más escuchados, `listMyBackdropAlbums`), un mosaico con la
// geometría del de la portada donde sus carátulas ocupan las celdas visibles y el resto son recortes del
// mosaico general (un solo archivo ya en caché); con menos, el mosaico general entero, como antes. Decorativo:
// oculto para tecnologías de asistencia y sin enlaces. Las carátulas propias se cargan sin prioridad, para no
// competir con el titular ni con la carátula de «Última vez».
export function HeroBackdrop({ albums }: { albums: readonly HomeBackdropAlbum[] }) {
  if (albums.length < BACKDROP_MIN) {
    return (
      <div
        aria-hidden
        data-backdrop="general"
        className={`${LAYER_CLASS} bg-cover bg-center`}
        style={{ backgroundImage: `url(${HERO_WALL.src})` }}
      />
    );
  }

  const personal = new Map(PERSONAL_CELLS.slice(0, albums.length).map((cell, index) => [cell, albums[index]!]));
  const cells = Array.from({ length: HERO_WALL.cols * HERO_WALL.rows }, (_, index) => index);

  return (
    <div aria-hidden data-backdrop="personal" className={`${LAYER_CLASS} flex items-center overflow-hidden`}>
      <div className="grid w-full grid-cols-8">
        {cells.map((index) => {
          const album = personal.get(index);
          return album ? (
            <span key={index} data-cell="personal" className="relative block aspect-square bg-ink-surface">
              <AppImage src={album.coverThumbUrl} alt="" fill sizes="250px" loading="lazy" className="object-cover" />
            </span>
          ) : (
            <span key={index} data-cell="wall" className="block aspect-square" style={wallTile(index)} />
          );
        })}
      </div>
    </div>
  );
}
