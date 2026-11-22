// Smoke test de la Fase 2: ejecuta el pipeline de ingesta real
// (findOrIngestArtist -> findOrIngestDiscography -> findOrIngestTracklist)
// contra un `fetch` simulado que devuelve respuestas con la forma exacta
// de la API de MusicBrainz. Útil para validar el código sin red real, y
// como fixture de referencia para escribir tests de verdad más adelante.
//
// Los mbid usados son los reales de Pink Floyd / Roger Waters (son datos
// públicos, no secretos); el tracklist se acortó y se agregó un crédito
// extra sintético solo para poder probar el caso "feat." de punta a punta.
//
// ⚠️ Exige una BD de scratch VIRGEN. No es idempotente: si Pink Floyd ya
// existe con la discografía sincronizada, el browse mockeado se salta y el
// script reusa la discografía real; al elegir un release-group que no está en
// sus mocks, falla. Peor: si se forzara reseteando `discography_synced_at`,
// marcaría cientos de discos reales como "fuera de la discografía". Para
// re-poblarla, usá otro `DATABASE_URL` de scratch limpio (ver AGENTS.md).

export {}; // fuerza module scope; sin esto, TS trata el archivo como script global y colisiona con otros scripts/*.ts
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { runSmoke } from "./smoke-lib/run";

assertSmokeAllowed();

const PINK_FLOYD_MBID = "83d91898-7763-47d7-b03b-b92132375c47";
const ROGER_WATERS_MBID = "27f0d92e-6de2-4d38-b1a7-1c8ffa32ce2c";
const DSOTM_RG_MBID = "1e5eb684-d7e9-3699-8fed-6e2e5d0e0d16";
const DSOTM_RELEASE_MBID = "9e185369-0eb6-4013-8f7e-f8cd4be3ff02";
// Release-group sintético con fecha anual: ejercita la normalización de
// fechas parciales de MusicBrainz ('1985' no es un DATE válido para
// PostgreSQL y debe persistirse como null).
const ICON_RG_MBID = "b0a1b2c3-0000-4000-8000-00000000000d";
const ICON_RELEASE_MBID = "c0a1b2c3-0000-4000-8000-00000000000e";

// Respuesta del browse de ediciones (`/release?release-group=`): una sola edición oficial por álbum.
function editionsBrowse(rgMbid: string, title: string, releaseMbid: string, date: string, tracks: number) {
  return {
    "release-count": 1,
    "release-offset": 0,
    releases: [
      {
        id: releaseMbid,
        title,
        status: "Official",
        date,
        country: "GB",
        packaging: null,
        disambiguation: "",
        media: [{ position: 1, format: "CD", "track-count": tracks }],
        "label-info": [],
        "release-group": { id: rgMbid, title, "first-release-date": date, "primary-type": "Album", "secondary-types": [] },
      },
    ],
  };
}

const mockResponses: Record<string, unknown> = {
  "/artist?query=Pink+Floyd&limit=25&offset=0&fmt=json": {
    artists: [
      { id: PINK_FLOYD_MBID, name: "Pink Floyd", type: "Group", disambiguation: "banda británica de rock" },
    ],
  },
  [`/artist/${PINK_FLOYD_MBID}?inc=artist-rels%2Burl-rels&fmt=json`]: {
    id: PINK_FLOYD_MBID,
    name: "Pink Floyd",
    type: "Group",
    relations: [
      {
        type: "member of band",
        direction: "backward",
        artist: { id: ROGER_WATERS_MBID, name: "Roger Waters", type: "Person" },
        attributes: ["bass", "vocals"],
      },
    ],
  },
  [`/release-group?artist=${PINK_FLOYD_MBID}&limit=100&offset=0&inc=artist-credits%2Burl-rels&release-group-status=website-default&fmt=json`]: {
    "release-groups": [
      {
        id: DSOTM_RG_MBID,
        title: "The Dark Side of the Moon",
        "primary-type": "Album",
        "secondary-types": [],
        "artist-credit": [{ name: "Pink Floyd", artist: { id: PINK_FLOYD_MBID, name: "Pink Floyd" } }],
      },
      {
        id: ICON_RG_MBID,
        title: "Icon (fecha anual)",
        "primary-type": "Album",
        "secondary-types": [],
        "artist-credit": [{ name: "Pink Floyd", artist: { id: PINK_FLOYD_MBID, name: "Pink Floyd" } }],
      },
    ],
  },
  [`/release?release-group=${DSOTM_RG_MBID}&limit=100&offset=0&inc=labels%2Bmedia%2Brelease-groups&fmt=json`]: editionsBrowse(DSOTM_RG_MBID, "The Dark Side of the Moon", DSOTM_RELEASE_MBID, "1973-03-01", 2),
  [`/release?release-group=${ICON_RG_MBID}&limit=100&offset=0&inc=labels%2Bmedia%2Brelease-groups&fmt=json`]: editionsBrowse(ICON_RG_MBID, "Icon (fecha anual)", ICON_RELEASE_MBID, "1985", 0),
  [`/release/${DSOTM_RELEASE_MBID}?inc=recordings%2Bartist-credits%2Bartist-rels%2Brecording-level-rels%2Bwork-rels%2Bwork-level-rels&fmt=json`]: {
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
  [`/release/${ICON_RELEASE_MBID}?inc=recordings%2Bartist-credits%2Bartist-rels%2Brecording-level-rels%2Bwork-rels%2Bwork-level-rels&fmt=json`]: {
    id: ICON_RELEASE_MBID,
    title: "Icon (fecha anual)",
    date: "1985",
    media: [],
  },
};

// Cover Art Archive: DSOTM con carátula (200), Icon sin carátula (404).
// El resolver hace un HEAD, así que el body no importa; solo el status.
const coverArtStatusByUrl = new Map<string, number>([
  [`https://coverartarchive.org/release-group/${DSOTM_RG_MBID}/front-250`, 200],
  [`https://coverartarchive.org/release-group/${ICON_RG_MBID}/front-250`, 404],
]);

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

  if (url.hostname === "coverartarchive.org") {
    const status = coverArtStatusByUrl.get(url.toString()) ?? 404;
    return new Response("", { status });
  }

  const key = normalizeKey(url.pathname, url.searchParams);
  const body = mockResponsesByNormalizedKey.get(key);
  if (!body) {
    throw new Error(
      `No hay mock para: ${key}\nMocks disponibles:\n${[...mockResponsesByNormalizedKey.keys()].join("\n")}`,
    );
  }
  return new Response(JSON.stringify(body), { status: 200 });
}) as typeof fetch;

async function pinkFloydSynced(): Promise<boolean> {
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../src/db");
  const { artist: artistTable } = await import("../src/db/schema");
  const [existing] = await db.select().from(artistTable).where(eq(artistTable.name, "Pink Floyd")).limit(1);
  return Boolean(existing?.discographySyncedAt);
}

// Es el script que POBLA los datos que `smoke-test-routes.ts`, `smoke-test-new-endpoints.ts` y otros leen (Pink Floyd, DSOTM):
// por eso no limpia sus fixtures y exige una BD virgen (ver docs/06-operations/smoke-tests.md).
void runSmoke({
  name: "ingestion",
  pristineCheck: async () =>
    (await pinkFloydSynced())
      ? "Pink Floyd ya existe con la discografía sincronizada: el browse mockeado se saltaría y el reset marcaría cientos de discos reales como fuera de la discografía."
      : null,
  run: main,
});

async function main() {
  const { ensureArtistMemberships, findOrIngestArtist } = await import("../src/services/catalog/ingest-artist");
  const { findOrIngestDiscography } = await import("../src/services/catalog/ingest-discography");
  const { findOrIngestTracklist } = await import("../src/services/catalog/ingest-release");

  console.log("1) Ingiriendo artista...");
  const artist = await findOrIngestArtist("Pink Floyd");
  console.log("   ->", artist);
  console.log("   -> sincronizando memberships...");
  await ensureArtistMemberships(artist!);

  console.log("2) Ingiriendo discografía...");
  const releaseGroups = await findOrIngestDiscography(artist!);
  console.log("   ->", releaseGroups);

  console.log("3) Ingiriendo tracklist...");
  const rg = releaseGroups[0]!;
  const release = await findOrIngestTracklist(rg.id, rg.mbid!);
  console.log("   ->", release);
  console.log("   -> carátula (baja resolución):", release!.coverThumbUrl);

  console.log("4) Ingiriendo un álbum con fecha anual (1985)...");
  const annualRg = releaseGroups.find((rg) => rg.title === "Icon (fecha anual)");
  if (!annualRg) {
    throw new Error("No se encontró el release-group de fecha anual en la discografía");
  }
  const annualRelease = await findOrIngestTracklist(annualRg.id, annualRg.mbid!);
  console.log("   ->", annualRelease);
  if (annualRelease?.releaseDate !== null) {
    throw new Error(`Se esperaba releaseDate null para fecha anual (1985), se obtuvo ${annualRelease?.releaseDate}`);
  }
  console.log("   -> releaseDate normalizado a null sin PostgresError");
  if (annualRelease?.coverThumbUrl !== null) {
    throw new Error(
      `Se esperaba coverThumbUrl null para un álbum sin carátula, se obtuvo ${annualRelease?.coverThumbUrl}`,
    );
  }
  console.log("   -> coverThumbUrl null sin carátula (404)");

  global.fetch = realFetch;
}
