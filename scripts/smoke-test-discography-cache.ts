export {}; // fuerza module scope

// Prueba puntual del bug reportado: findOrIngestDiscography no chequeaba
// cache y volvía a pegarle a MusicBrainz en cada búsqueda, incluso para
// un artista ya sincronizado. Este test cuenta cuántas veces se llama al
// endpoint de browse y falla si la segunda invocación lo vuelve a tocar.

const TEST_ARTIST_MBID = "aaaaaaaa-1111-2222-3333-444444444444";

let browseCallCount = 0;

const mockBrowseResponse = {
  "release-groups": [
    {
      id: "bbbbbbbb-1111-2222-3333-444444444444",
      title: "Álbum de Prueba",
      "primary-type": "Album",
      "secondary-types": [],
      "artist-credit": [{ name: "Artista de Prueba", artist: { id: TEST_ARTIST_MBID, name: "Artista de Prueba" } }],
    },
  ],
};

const realFetch = global.fetch;
global.fetch = (async (input: RequestInfo | URL) => {
  const url = new URL(input.toString());
  if (url.pathname === "/ws/2/release-group") {
    browseCallCount++;
    return new Response(JSON.stringify(mockBrowseResponse), { status: 200 });
  }
  throw new Error(`No hay mock para: ${url.pathname}${url.search}`);
}) as typeof fetch;

async function main() {
  const { upsertArtistFromMb } = await import("../src/services/catalog/ingest-artist");
  const { findOrIngestDiscography } = await import("../src/services/catalog/ingest-discography");

  const artist = await upsertArtistFromMb(TEST_ARTIST_MBID, "Artista de Prueba", "Group");

  console.log("1) Primera llamada (debe consultar MusicBrainz)...");
  const first = await findOrIngestDiscography(artist);
  console.log(`   -> ${first.length} álbum(es), browseCallCount=${browseCallCount}`);

  console.log("2) Segunda llamada con el mismo artista (NO debe volver a consultar)...");
  // Se vuelve a leer el artista de la base para tener discographySyncedAt actualizado,
  // tal como pasaría en un request nuevo real.
  const { db } = await import("../src/db");
  const { artist: artistTable } = await import("../src/db/schema");
  const { eq } = await import("drizzle-orm");
  const [refreshed] = await db.select().from(artistTable).where(eq(artistTable.id, artist.id)).limit(1);

  const second = await findOrIngestDiscography(refreshed!);
  console.log(`   -> ${second.length} álbum(es), browseCallCount=${browseCallCount}`);

  global.fetch = realFetch;

  if (browseCallCount === 1 && second.length === first.length) {
    console.log("\n✅ Corregido: la segunda llamada usó el cache, no volvió a tocar MusicBrainz.");
  } else {
    console.log(`\n❌ Sigue fallando (browseCallCount=${browseCallCount}, esperado 1).`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
