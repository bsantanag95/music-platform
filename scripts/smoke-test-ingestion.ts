// Smoke test de la Fase 2: ejecuta el pipeline de ingesta real
// (findOrIngestArtist -> findOrIngestDiscography -> findOrIngestTracklist)
// contra un `fetch` simulado que devuelve respuestas con la forma exacta
// de la API de MusicBrainz. Útil para validar el código sin red real, y
// como fixture de referencia para escribir tests de verdad más adelante.
//
// Los mbid usados son los reales de Pink Floyd / Roger Waters (son datos
// públicos, no secretos); el tracklist se acortó y se agregó un crédito
// extra sintético solo para poder probar el caso "feat." de punta a punta.

const PINK_FLOYD_MBID = "83d91898-7763-47d7-b03b-b92132375c47";
const ROGER_WATERS_MBID = "27f0d92e-6de2-4d38-b1a7-1c8ffa32ce2c";
const DSOTM_RG_MBID = "1e5eb684-d7e9-3699-8fed-6e2e5d0e0d16";
const DSOTM_RELEASE_MBID = "9e185369-0eb6-4013-8f7e-f8cd4be3ff02";

const mockResponses: Record<string, unknown> = {
  "/artist?query=Pink+Floyd&fmt=json": {
    artists: [
      { id: PINK_FLOYD_MBID, name: "Pink Floyd", type: "Group", disambiguation: "banda británica de rock" },
    ],
  },
  [`/release-group?artist=${PINK_FLOYD_MBID}&limit=100&inc=artist-credits&fmt=json`]: {
    "release-groups": [
      {
        id: DSOTM_RG_MBID,
        title: "The Dark Side of the Moon",
        "primary-type": "Album",
        "secondary-types": [],
        "artist-credit": [{ name: "Pink Floyd", artist: { id: PINK_FLOYD_MBID, name: "Pink Floyd" } }],
      },
    ],
  },
  [`/release-group/${DSOTM_RG_MBID}?inc=releases&fmt=json`]: {
    id: DSOTM_RG_MBID,
    title: "The Dark Side of the Moon",
    releases: [{ id: DSOTM_RELEASE_MBID, status: "Official", date: "1973-03-01" }],
  },
  [`/release/${DSOTM_RELEASE_MBID}?inc=recordings%2Bartist-credits&fmt=json`]: {
    id: DSOTM_RELEASE_MBID,
    title: "The Dark Side of the Moon",
    date: "1973-03-01",
    media: [
      {
        position: 1,
        tracks: [
          {
            position: 1,
            recording: { id: "c0313f38-1a5c-4457-8e05-9dc45c2fda94", title: "Speak to Me", length: 90000 },
          },
          {
            position: 2,
            recording: { id: "6f2f3a5e-9e2c-4c9a-9b2a-2e6b6c9f1a11", title: "Breathe (In the Air)", length: 163000 },
            // Crédito extra sintético (no real en el álbum) solo para probar el caso feat. de punta a punta.
            "artist-credit": [
              { name: "Pink Floyd", joinphrase: " feat. ", artist: { id: PINK_FLOYD_MBID, name: "Pink Floyd" } },
              { name: "Roger Waters", artist: { id: ROGER_WATERS_MBID, name: "Roger Waters" } },
            ],
          },
        ],
      },
    ],
  },
};

function normalizeKey(pathname: string, params: URLSearchParams): string {
  const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const qs = sorted.map(([k, v]) => `${k}=${v}`).join("&");
  return `${pathname.replace("/ws/2", "")}?${qs}`;
}

const mockResponsesByNormalizedKey = new Map(
  Object.entries(mockResponses).map(([key, value]) => {
    const [pathname, qs] = key.split("?");
    return [normalizeKey(pathname!, new URLSearchParams(qs)), value];
  }),
);

const realFetch = global.fetch;
global.fetch = (async (input: RequestInfo | URL) => {
  const url = new URL(input.toString());
  const key = normalizeKey(url.pathname, url.searchParams);
  const body = mockResponsesByNormalizedKey.get(key);
  if (!body) {
    throw new Error(
      `No hay mock para: ${key}\nMocks disponibles:\n${[...mockResponsesByNormalizedKey.keys()].join("\n")}`,
    );
  }
  return new Response(JSON.stringify(body), { status: 200 });
}) as typeof fetch;

async function main() {
  const { findOrIngestArtist } = await import("../src/services/catalog/ingest-artist");
  const { findOrIngestDiscography } = await import("../src/services/catalog/ingest-discography");
  const { findOrIngestTracklist } = await import("../src/services/catalog/ingest-release");
  const { coverThumbUrl } = await import("../src/services/cover-art");

  console.log("1) Ingiriendo artista...");
  const artist = await findOrIngestArtist("Pink Floyd");
  console.log("   ->", artist);

  console.log("2) Ingiriendo discografía...");
  const releaseGroups = await findOrIngestDiscography(artist!.mbid!);
  console.log("   ->", releaseGroups);

  console.log("3) Ingiriendo tracklist...");
  const rg = releaseGroups[0]!;
  const release = await findOrIngestTracklist(rg.id, rg.mbid!);
  console.log("   ->", release);
  console.log("   -> carátula (baja resolución):", coverThumbUrl(release!.mbid!));

  global.fetch = realFetch;
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
