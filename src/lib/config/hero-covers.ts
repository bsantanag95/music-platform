// Muro de carátulas del hero anónimo: 32 portadas fijas, elegidas a mano, que
// forman la identidad visual del sitio. Se precomponen en UN solo mosaico
// (`public/hero/wall.webp`, ver `scripts/build-hero-wall.ts`), así el hero no
// consulta la base ni resuelve imágenes en runtime: es un único archivo estático.
// Ver docs/05-features/home.md.

/** Cuadrícula del mosaico. `HeroCoverWall` y el script comparten estas cifras. */
export const HERO_WALL = {
  cols: 8,
  rows: 4,
  /** Lado de cada celda en px. Bajo el tope de 250px de la política de licencia. */
  tile: 224,
  src: "/hero/wall.webp",
} as const;

export const HERO_COVER_COUNT = HERO_WALL.cols * HERO_WALL.rows;

export interface HeroCover {
  /** MBID del release-group; el script descarga su `front-250` de Cover Art Archive. */
  mbid: string;
  /** Solo para quien cura la lista (y la atribución); no se renderiza. */
  title: string;
  artist: string;
}

/**
 * Orden de lectura: izquierda→derecha, arriba→abajo. El orden ES el diseño:
 * la selección se agrupa a mano, no se baraja. Cambiarla exige regenerar el
 * mosaico: `npx tsx --env-file=.env scripts/build-hero-wall.ts`.
 *
 * Fila 4: portadas con lo reconocible en su mitad superior (el degradado
 * y el recorte inferior del hero ocultan el resto). Stryper va en la fila 2,
 * columna 2, fuera del bloque central tapado por el titular.
 * El script exige exactamente `HERO_COVER_COUNT` entradas.
 */
export const HERO_COVERS: readonly HeroCover[] = [
  // Fila 1
  { mbid: "d12aff28-a9e3-3be8-a36a-71e2f11bf575", title: "Space Is the Place", artist: "Sun Ra" },
  { mbid: "6b4ea595-3378-3019-be5f-058412670791", title: "At Folsom Prison", artist: "Johnny Cash" },
  { mbid: "f3578417-4c90-3891-a2cf-d1eab06cc084", title: "Os Mutantes", artist: "Os Mutantes" },
  { mbid: "740ec10a-e887-38a6-a04d-fe2069c9e2a7", title: "Pink Moon", artist: "Nick Drake" },
  { mbid: "42352def-1aab-3000-b548-895ebd869cb6", title: "Unknown Pleasures", artist: "Joy Division" },
  { mbid: "610fb60f-900a-3c42-ac7d-f6b6aa8035f9", title: "Enter the Wu-Tang (36 Chambers)", artist: "Wu-Tang Clan" },
  { mbid: "ab570ccb-b06b-3746-8147-4903163ba895", title: "Madvillainy", artist: "Madvillain" },
  { mbid: "068b1ec1-9922-301c-b57c-8bf76a303098", title: "Sorrow Tears and Blood", artist: "Fela Kuti" },
  // Fila 2
  { mbid: "aa997ea0-2936-40bd-884d-3af8a0e064dc", title: "Random Access Memories", artist: "Daft Punk" },
  { mbid: "b0925fa4-a087-3fdf-936c-d04d9d605f8a", title: "Soldiers Under Command", artist: "Stryper" },
  { mbid: "810272e0-aef1-3d85-b2d3-e512e87fc38c", title: "Homogenic", artist: "Björk" },
  { mbid: "16cc9dfc-594d-3fb9-b789-3e1bfcb6f9f8", title: "Power, Corruption & Lies", artist: "New Order" },
  { mbid: "6eac2e57-ee50-36f8-b0c4-c4c847a2c098", title: "Back to Black", artist: "Amy Winehouse" },
  { mbid: "a334e612-e736-3b4f-82b4-c4dfb774983c", title: "Maggot Brain", artist: "Funkadelic" },
  { mbid: "17d74d52-c92b-3b8d-9f87-218ab2d1c4a0", title: "Music Has the Right to Children", artist: "Boards of Canada" },
  { mbid: "bbff1663-e67a-3b12-b7a5-c4ffe2267e17", title: "Buscando América", artist: "Rubén Blades y Seis del Solar" },
  // Fila 3
  { mbid: "bb3ec118-57df-4eb9-a8fe-a26a70a7dbe0", title: "LUX", artist: "Rosalía" },
  { mbid: "d8dde278-482c-3cc8-a530-fea70476f3a5", title: "The Queen Is Dead", artist: "The Smiths" },
  { mbid: "92d8f0c4-8c64-3bee-bee1-812a70e77efa", title: "Dirt", artist: "Alice in Chains" },
  { mbid: "a348ba2f-f8b3-4686-b928-e63d8d94d543", title: "AM", artist: "Arctic Monkeys" },
  { mbid: "cb76227e-3ac0-3002-9a10-615a5b73cc59", title: "Loveless", artist: "My Bloody Valentine" },
  { mbid: "8d73e45e-7ca1-3cb4-ae28-6da76196c17c", title: "London Calling", artist: "The Clash" },
  { mbid: "a50636b5-5233-3329-a7f3-dba3d0e00ef7", title: "In the Court of the Crimson King", artist: "King Crimson" },
  { mbid: "5fa20be8-ea07-31bd-a915-f12a3ab8495e", title: "Barrio Fino", artist: "Daddy Yankee" },
  // Fila 4
  { mbid: "8e8a594f-2175-38c7-a871-abb68ec363e7", title: "Kind of Blue", artist: "Miles Davis" },
  { mbid: "c5650313-60f3-34d3-92e4-300545133792", title: "Exodus", artist: "Bob Marley & The Wailers" },
  { mbid: "ff8f533c-3cb3-3877-9209-11f433edaad2", title: "Horses", artist: "Patti Smith" },
  { mbid: "76e5fdb9-6107-3d9d-b92b-4e913c7d93ea", title: "MTV Unplugged", artist: "La Ley" },
  { mbid: "e51e9779-2edc-3b39-959c-299fdb5ed940", title: "Master of Reality", artist: "Black Sabbath" },
  { mbid: "5cbd9d7b-597a-3c5e-bfd1-c2b364215560", title: "The Velvet Underground & Nico", artist: "The Velvet Underground" },
  { mbid: "f2f954cb-3083-3261-bef1-e97bfe80987a", title: "To Mega Therion", artist: "Celtic Frost" },
  { mbid: "50f8710f-3ae6-319b-85a7-afe783f13449", title: "Aladdin Sane", artist: "David Bowie" },
];
