export {}; // fuerza module scope
import { assertSmokeAllowed } from "./assert-smoke-allowed";

assertSmokeAllowed();

// Smoke test del tipo Canciones (add-recording-album-search, reescrito para
// redesign-scoped-search): busca "stairway de prueba" con el tipo Canciones
// contra una BD de scratch con fetch mockeado y verifica:
//   1) la canción en frío es el primer grupo, con la UNIÓN de apariciones de
//      sus versiones (toma de estudio acreditada + live SIN artist-credit, que
//      se une al grupo del mismo título), y persiste recording +
//      créditos + stubs de release_group (una sola ingesta: la identidad),
//   2) NO escribe release ni track (prohibición de ingestas parciales),
//   3) la segunda búsqueda no repite requests de recordings (caché TTL del
//      cliente) y es idempotente (no duplica filas),
//   4) al terminar limpia TODOS los fixtures que creó.

const TEST_RECORDING_MBID = "aaaaaaaa-0000-4000-8000-910000000001";
const TEST_LIVE_RECORDING_MBID = "aaaaaaaa-0000-4000-8000-910000000005";
const TEST_RELEASE_GROUP_MBID = "bbbbbbbb-0000-4000-8000-910000000002";
const TEST_LIVE_RELEASE_GROUP_MBID = "bbbbbbbb-0000-4000-8000-910000000006";
const TEST_RELEASE_MBID = "cccccccc-0000-4000-8000-910000000003";
const TEST_ARTIST_MBID = "dddddddd-0000-4000-8000-910000000004";
const QUERY = "stairway de prueba";

const fetchCounts: Record<string, number> = {};
/** Búsquedas de release-groups (con `query=`), distintas del browse de discografía. */
let releaseGroupSearches = 0;

const mbRecordingSearchResponse = {
  recordings: [
    {
      id: TEST_RECORDING_MBID,
      title: "Stairway de Prueba",
      length: 480000,
      score: 100,
      "artist-credit": [
        { name: "Artista de Prueba", joinphrase: "", artist: { id: TEST_ARTIST_MBID, name: "Artista de Prueba" } },
      ],
    },
    {
      id: TEST_LIVE_RECORDING_MBID,
      title: "Stairway de Prueba (live)",
      score: 95,
    },
  ],
};

function studioReleases() {
  return {
    releases: [
      {
        id: TEST_RELEASE_MBID,
        title: "Led Discografía de Prueba",
        date: "1971-11-08",
        status: "Official",
        "release-group": {
          id: TEST_RELEASE_GROUP_MBID,
          title: "Álbum de Prueba",
          "primary-type": "Album",
          "secondary-types": [],
        },
      },
    ],
    "release-count": 1,
  };
}

function liveReleases() {
  return {
    releases: [
      {
        id: "cccccccc-0000-4000-8000-910000000007",
        title: "En Vivo de Prueba",
        date: "1975-01-01",
        status: "Official",
        "release-group": {
          id: TEST_LIVE_RELEASE_GROUP_MBID,
          title: "Álbum en Vivo de Prueba",
          "primary-type": "Album",
          "secondary-types": ["Live"],
        },
      },
    ],
    "release-count": 1,
  };
}

const realFetch = global.fetch;
global.fetch = (async (input: RequestInfo | URL) => {
  const url = new URL(input.toString());
  fetchCounts[url.pathname] = (fetchCounts[url.pathname] ?? 0) + 1;
  if (url.pathname === "/ws/2/release-group" && url.searchParams.has("query")) releaseGroupSearches++;

  if (url.pathname === "/ws/2/artist") {
    return new Response(JSON.stringify({ artists: [] }), { status: 200 });
  }
  if (url.pathname === "/ws/2/release-group") {
    return new Response(JSON.stringify({ "release-groups": [] }), { status: 200 });
  }
  if (url.pathname === "/ws/2/recording") {
    return new Response(JSON.stringify(mbRecordingSearchResponse), { status: 200 });
  }
  if (url.pathname === "/ws/2/release") {
    const body = url.searchParams.get("recording") === TEST_LIVE_RECORDING_MBID ? liveReleases() : studioReleases();
    return new Response(JSON.stringify(body), { status: 200 });
  }
  throw new Error(`No hay mock para: ${url.pathname}${url.search}`);
}) as typeof fetch;

async function main() {
  const { db } = await import("../src/db");
  const { artist, credit, recording, release, releaseGroup, track } = await import("../src/db/schema");
  const { eq, inArray } = await import("drizzle-orm");
  const { searchSongs } = await import("../src/services/catalog/search/songs");

  let failures = 0;
  const check = (label: string, ok: boolean) => {
    console.log(`   ${ok ? "OK" : "FALLA"} — ${label}`);
    if (!ok) failures++;
  };

  console.log("1) Búsqueda en frío de la canción...");
  const first = await searchSongs(QUERY);
  const song = first.results[0];
  check("un solo grupo: la versión sin crédito se une a la del mismo título", first.results.length === 1);
  check("primer grupo con la canción detectada", song?.title === "Stairway de Prueba");
  const albumTitles = (song?.albums ?? []).map((a) => a.title);
  check(
    "UNIÓN de apariciones: estudio + live de dos grabaciones distintas",
    albumTitles.includes("Álbum de Prueba") && albumTitles.includes("Álbum en Vivo de Prueba"),
  );
  check(
    "álbum enlazable: usa el id local del release_group stub y orden por categoría",
    song?.albums[0]?.category === "studio" && song?.albums[0]?.year === 1971,
  );
  check(
    "identidad = primera grabación (gana por release-count), una sola ingesta",
    song?.mbid === TEST_RECORDING_MBID,
  );

  const [recRow] = await db.select().from(recording).where(eq(recording.mbid, TEST_RECORDING_MBID)).limit(1);
  const [liveRecRow] = await db
    .select()
    .from(recording)
    .where(eq(recording.mbid, TEST_LIVE_RECORDING_MBID))
    .limit(1);
  const [rgRow] = await db
    .select()
    .from(releaseGroup)
    .where(eq(releaseGroup.mbid, TEST_RELEASE_GROUP_MBID))
    .limit(1);
  const [liveRgRow] = await db
    .select()
    .from(releaseGroup)
    .where(eq(releaseGroup.mbid, TEST_LIVE_RELEASE_GROUP_MBID))
    .limit(1);
  const [artistRow] = await db.select().from(artist).where(eq(artist.mbid, TEST_ARTIST_MBID)).limit(1);
  check("recording identidad persistida", Boolean(recRow?.title === "Stairway de Prueba" && recRow.durationSec === 480));
  check("la otra versión queda efímera (no se ingiere)", !liveRecRow);
  check("ambos release_group persistidos como stubs", Boolean(rgRow && liveRgRow));
  check("crédito de la grabación ingerido", Boolean(artistRow));
  const credits = await db.select().from(credit).where(eq(credit.recordingId, recRow!.id));
  check("la grabación quedó acreditada al artista", credits.length === 1 && credits[0]!.artistId === artistRow!.id);

  const releaseRows = await db.select().from(release).where(eq(release.mbid, TEST_RELEASE_MBID));
  const trackRows = recRow ? await db.select().from(track).where(eq(track.recordingId, recRow.id)) : [];
  check("CERO escrituras a release", releaseRows.length === 0);
  check("CERO escrituras a track", trackRows.length === 0);

  // Conteos tras la primera búsqueda: la BD puede tener artistas cuyo nombre
  // ocupa un extremo de la consulta (p. ej. una banda "Stairway"), lo que suma
  // una interpretación a probar; lo que se verifica es que la segunda búsqueda
  // no agregue ninguna solicitud.
  const afterFirst = { ...fetchCounts };

  console.log("2) Segunda búsqueda (caché del cliente + idempotencia)...");
  const second = await searchSongs(QUERY);
  check(
    "el resultado coincide con la primera resolución",
    JSON.stringify(second.results) === JSON.stringify(first.results),
  );
  check(
    "no repitió requests de recordings ni de apariciones",
    fetchCounts["/ws/2/recording"] === afterFirst["/ws/2/recording"] &&
      fetchCounts["/ws/2/release"] === afterFirst["/ws/2/release"],
  );
  check("nunca más de dos búsquedas de recordings", (afterFirst["/ws/2/recording"] ?? 0) <= 2);
  check("apariciones: un browse por versión del grupo (2)", afterFirst["/ws/2/release"] === 2);
  check("el tipo Canciones no busca álbumes", releaseGroupSearches === 0);
  const recCount = await db.select().from(recording).where(eq(recording.mbid, TEST_RECORDING_MBID));
  check("grabación no duplicada", recCount.length === 1);

  // openspec: speed-up-quick-actions-search — el diálogo "Añadir" busca canciones en modo de elección.
  console.log("2b) Modo de elección (purpose=pick) y búsqueda abandonada...");
  const beforePick = { ...fetchCounts };
  const picked = await searchSongs(QUERY, { purpose: "pick" });
  check(
    "modo de elección: el grupo trae la grabación de estudio ya registrada, sin apariciones",
    picked.results.length === 1 && picked.results[0]?.recordingId === recRow?.id && picked.results[0]?.albums.length === 0,
  );
  check("modo de elección: sin browse de apariciones", fetchCounts["/ws/2/release"] === beforePick["/ws/2/release"]);
  check("modo de elección: sin paginar", picked.nextOffset === null);
  const pickCount = await db.select().from(recording).where(eq(recording.mbid, TEST_RECORDING_MBID));
  check("modo de elección: no duplica la grabación", pickCount.length === 1);

  const abandoned = new AbortController();
  abandoned.abort();
  const beforeAbort = JSON.stringify(fetchCounts);
  const abandonedResult = await searchSongs("otra canción de prueba", { purpose: "pick", signal: abandoned.signal }).then(
    () => "resuelta",
    (err: unknown) => (err instanceof Error || err instanceof DOMException ? err.name : "otro"),
  );
  check("búsqueda abandonada: rechaza con AbortError", abandonedResult === "AbortError");
  check("búsqueda abandonada: no emitió requests a MusicBrainz", JSON.stringify(fetchCounts) === beforeAbort);

  global.fetch = realFetch;

  console.log("3) Limpieza de fixtures...");
  if (recRow) await db.delete(credit).where(inArray(credit.recordingId, [recRow.id]));
  if (artistRow) await db.delete(credit).where(eq(credit.artistId, artistRow.id));
  if (recRow) await db.delete(recording).where(eq(recording.id, recRow.id));
  if (rgRow) await db.delete(releaseGroup).where(eq(releaseGroup.id, rgRow.id));
  if (liveRgRow) await db.delete(releaseGroup).where(eq(releaseGroup.id, liveRgRow.id));
  if (artistRow) await db.delete(artist).where(eq(artist.id, artistRow.id));
  console.log("   fixtures borrados.");

  if (failures === 0) {
    console.log("\n✅ smoke-test-recording-search: todo correcto.");
    process.exit(0);
  } else {
    console.log(`\n❌ smoke-test-recording-search: ${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
