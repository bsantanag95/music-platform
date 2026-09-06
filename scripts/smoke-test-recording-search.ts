export {}; // fuerza module scope
import { assertSmokeAllowed } from "./assert-smoke-allowed";

assertSmokeAllowed();

// Smoke test de add-recording-album-search: busca "stairway de prueba" contra
// una BD de scratch con fetch mockeado y verifica:
//   1) la canción en frío produce songContext con la UNIÓN de apariciones de
//      los candidatos (toma de estudio + live), y persiste recording +
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
  const { searchCatalog } = await import("../src/services/catalog/search-catalog");

  let failures = 0;
  const check = (label: string, ok: boolean) => {
    console.log(`   ${ok ? "OK" : "FALLA"} — ${label}`);
    if (!ok) failures++;
  };

  console.log("1) Búsqueda en frío de la canción...");
  const first = await searchCatalog(QUERY);
  check(
    "songContext presente con la canción detectada",
    first.songContext?.title === "Stairway de Prueba",
  );
  const albumTitles = (first.songContext?.albums ?? []).map((a) => a.title);
  check(
    "UNIÓN de apariciones: estudio + live de dos grabaciones distintas",
    albumTitles.includes("Álbum de Prueba") && albumTitles.includes("Álbum en Vivo de Prueba"),
  );
  check(
    "álbum enlazable: usa el id local del release_group stub y orden por categoría",
    first.songContext?.albums[0]?.category === "studio" && first.songContext?.albums[0]?.year === 1971,
  );
  check(
    "identidad = primera grabación (gana por release-count), una sola ingesta",
    first.songContext?.mbid === TEST_RECORDING_MBID,
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

  console.log("2) Segunda búsqueda (caché del cliente + idempotencia)...");
  const second = await searchCatalog(QUERY);
  check(
    "songContext coincide con la primera resolución",
    JSON.stringify(second.songContext) === JSON.stringify(first.songContext),
  );
  check(
    "no repitió requests de recordings ni de apariciones",
    fetchCounts["/ws/2/recording"] === 1 && fetchCounts["/ws/2/release"] === 2,
  );
  const recCount = await db.select().from(recording).where(eq(recording.mbid, TEST_RECORDING_MBID));
  check("grabación no duplicada", recCount.length === 1);

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
