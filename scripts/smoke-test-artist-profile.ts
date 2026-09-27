export {}; // fuerza module scope
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { SMOKE_PREFIX, smokeMbid } from "./smoke-album-fixtures";

assertSmokeAllowed();

// Smoke test del perfil de artista contra Postgres real (openspec: enrich-artist-profile,
// ADR 0021). Mockea `global.fetch` para MusicBrainz y Wikimedia con respuestas sintéticas
// (MBID `5e0ce000-0000-4000-8000-*`) y verifica: la ficha llega con la misma request que las
// pertenencias; los enlaces curados; el enriquecimiento de Wikimedia (foto con crédito,
// descripción, resumen solo en español, lugar con país); el respaldo de idioma de la lectura;
// los CHECK de la migración 0054; el retiro de fotos; y que un fallo de Wikimedia conserva los
// datos. Borra sus fixtures al terminar (también si falla).

let failures = 0;
function check(condition: boolean, message: string) {
  console.log(`${condition ? "✅" : "❌"} ${message}`);
  if (!condition) failures++;
}

const BAND = smokeMbid(SMOKE_PREFIX, 0x6001);
const MEMBER = smokeMbid(SMOKE_PREFIX, 0x6002);
const QID = "Q900000001";
const PLACE = "Q900000002";
const COUNTRY = "Q900000003";
const FILE = "Banda de humo (smoke).jpg";

const artistResponse = {
  id: BAND,
  name: "Banda de perfil (smoke)",
  type: "Group",
  disambiguation: "smoke test band",
  country: "CL",
  "begin-area": { id: "x", name: "Curicó" },
  "life-span": { begin: "2003", end: null, ended: false },
  relations: [
    { type: "member of band", "target-type": "artist", direction: "backward", attributes: ["guitar"], begin: "2003", end: null, artist: { id: MEMBER, name: "Integrante (smoke)", type: "Person" } },
    { type: "wikidata", "target-type": "url", url: { resource: `https://www.wikidata.org/wiki/${QID}` } },
    { type: "bandcamp", "target-type": "url", url: { resource: "https://smoke.bandcamp.com/" } },
    { type: "free streaming", "target-type": "url", url: { resource: "https://open.spotify.com/artist/smoke" } },
    { type: "social network", "target-type": "url", url: { resource: "https://twitter.com/smoke" } },
  ],
};

const entities: Record<string, unknown> = {
  [QID]: {
    id: QID,
    descriptions: { es: { language: "es", value: "banda chilena de humo" }, en: { language: "en", value: "Chilean smoke band" } },
    sitelinks: { eswiki: { site: "eswiki", title: "Banda de humo" } },
    claims: {
      P18: [{ mainsnak: { datavalue: { value: FILE } }, rank: "normal" }],
      P740: [{ mainsnak: { datavalue: { value: { id: PLACE } } }, rank: "normal" }],
    },
  },
  [PLACE]: { id: PLACE, labels: { es: { language: "es", value: "Curicó" }, en: { language: "en", value: "Curicó" } }, claims: { P17: [{ mainsnak: { datavalue: { value: { id: COUNTRY } } }, rank: "normal" }] } },
  [COUNTRY]: { id: COUNTRY, labels: { es: { language: "es", value: "Chile" }, en: { language: "en", value: "Chile" } } },
};

async function main() {
  const { db } = await import("../src/db");
  const schema = await import("../src/db/schema");
  const { eq, like, sql } = await import("drizzle-orm");
  const { upsertArtistFromMb, ensureArtistMemberships } = await import("../src/services/catalog/ingest-artist");
  const { refreshArtistProfile } = await import("../src/services/catalog/artist-profile-sync");
  const { getArtistProfile } = await import("../src/services/catalog/artist-profile-read");
  const { setArtistPhotoBlocked } = await import("../src/services/catalog/artist-wikimedia");

  process.env.WIKIMEDIA_USER_AGENT ??= "music-platform-smoke (smoke@example.com)";
  let wikimediaDown = false;
  const calls: string[] = [];
  const realFetch = global.fetch;
  global.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(input.toString());
    const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
    if (url.hostname === "musicbrainz.org") {
      calls.push(`mb:${url.pathname}`);
      check(url.searchParams.get("inc") === "artist-rels+url-rels", "MusicBrainz sin géneros ni etiquetas");
      return json(artistResponse);
    }
    calls.push(`wm:${url.hostname}`);
    if (wikimediaDown) return new Response("caído", { status: 500 });
    if (url.hostname === "www.wikidata.org") {
      const ids = (url.searchParams.get("ids") ?? "").split("|");
      return json({ entities: Object.fromEntries(ids.map((id) => [id, entities[id]])) });
    }
    if (url.hostname === "es.wikipedia.org") {
      return json({ query: { pages: [{ title: "Banda de humo", extract: "La Banda de humo es una banda de prueba.", fullurl: "https://es.wikipedia.org/wiki/Banda_de_humo" }] } });
    }
    if (url.hostname === "commons.wikimedia.org") {
      return json({
        query: {
          pages: [
            {
              title: `File:${FILE}`,
              imageinfo: [
                {
                  thumburl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/smoke.jpg/500px-smoke.jpg",
                  descriptionurl: "https://commons.wikimedia.org/wiki/File:Smoke.jpg",
                  extmetadata: {
                    LicenseShortName: { value: "CC BY-SA 4.0" },
                    LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0" },
                    Artist: { value: '<a href="#">Fotógrafa &amp; Co.</a>' },
                  },
                },
              ],
            },
          ],
        },
      });
    }
    throw new Error(`No hay mock para: ${url}`);
  }) as typeof fetch;

  async function cleanup() {
    await db.delete(schema.artist).where(like(sql`${schema.artist.mbid}::text`, `${SMOKE_PREFIX}%`));
  }
  async function reload(id: string) {
    const [row] = await db.select().from(schema.artist).where(eq(schema.artist.id, id));
    return row!;
  }

  try {
    await cleanup();
    const band = await upsertArtistFromMb(BAND, "Banda de perfil (smoke)", "Group", "smoke test band");
    check(band.disambiguation === "smoke test band", "la desambiguación se guarda en `disambiguation`");

    console.log("1) Pertenencias y ficha con una sola request");
    await ensureArtistMemberships(band);
    check(calls.filter((c) => c.startsWith("mb:")).length === 1, "una sola request a MusicBrainz");
    const synced = await reload(band.id);
    check(
      synced.country === "CL" && synced.beginAreaName === "Curicó" && synced.lifeBegin === "2003" && synced.lifeEnded === false && synced.wikidataId === QID,
      "ficha guardada (país, lugar, inicio, activa, Wikidata)",
    );
    const links = await db.select().from(schema.artistLink).where(eq(schema.artistLink.artistId, band.id));
    check(
      links.map((l) => `${l.position}:${l.kind}`).sort().join(",") === "0:bandcamp,1:streaming",
      `enlaces curados sin redes sociales (${links.map((l) => l.kind).join(", ")})`,
    );

    console.log("2) Wikimedia: foto con crédito, textos por idioma y lugar con país");
    const refresh = await refreshArtistProfile(band.id);
    check(refresh.facts === "skipped", "la ficha recién sincronizada no se vuelve a pedir");
    check(refresh.wikimedia === "enriched", `enriquecido desde Wikimedia (${refresh.wikimedia})`);
    const enriched = await reload(band.id);
    check(
      enriched.photoLicense === "CC BY-SA 4.0" && enriched.photoAuthor === "Fotógrafa & Co." && enriched.photoSourceUrl !== null,
      "foto con licencia, autor en texto plano y enlace al archivo",
    );
    const es = await getArtistProfile(enriched, "es");
    const en = await getArtistProfile(enriched, "en");
    check(es.description === "banda chilena de humo" && en.description === "Chilean smoke band", "descripción por idioma");
    check(es.summary?.language === "es" && en.summary?.language === "es", "sin artículo en inglés, la lectura en inglés usa el resumen en español");
    check(es.placeLabel === "Curicó, Chile", `lugar con país (${es.placeLabel})`);
    check(!JSON.stringify(es).includes("smoke test band"), "el perfil no expone la desambiguación");

    console.log("3) Restricciones de la migración 0054");
    const photoCheck = await db
      .update(schema.artist)
      .set({ photoLicense: null })
      .where(eq(schema.artist.id, band.id))
      .then(() => null)
      .catch((e: { cause?: { code?: string }; code?: string }) => e.cause?.code ?? e.code ?? "error");
    check(photoCheck === "23514", `una foto sin licencia viola chk_artist_photo_credit (${photoCheck})`);
    const summaryCheck = await db
      .update(schema.artistLocalizedText)
      .set({ summaryUrl: null })
      .where(eq(schema.artistLocalizedText.artistId, band.id))
      .then(() => null)
      .catch((e: { cause?: { code?: string }; code?: string }) => e.cause?.code ?? e.code ?? "error");
    check(summaryCheck === "23514", `un resumen sin artículo viola el CHECK de atribución (${summaryCheck})`);

    console.log("4) Wikimedia caído: se conservan los datos");
    wikimediaDown = true;
    await db.update(schema.artist).set({ wikimediaSyncedAt: sql`now() - interval '31 days'` }).where(eq(schema.artist.id, band.id));
    const down = await refreshArtistProfile(band.id);
    const kept = await reload(band.id);
    check(down.wikimedia === "error" && kept.photoLicense === "CC BY-SA 4.0", "falló sin borrar la foto");
    wikimediaDown = false;

    console.log("5) Retiro de la foto a pedido");
    await setArtistPhotoBlocked(band.id, true);
    await refreshArtistProfile(band.id, { force: true });
    const blocked = await reload(band.id);
    check(blocked.photoBlockedAt !== null && blocked.photoUrl === null, "la foto sigue retirada después de otro enriquecimiento");
  } finally {
    global.fetch = realFetch;
    await cleanup();
    console.log("\nFixtures borrados.");
  }

  console.log(failures === 0 ? "\n✅ Smoke test de perfil de artista OK" : `\n❌ ${failures} verificación(es) fallaron`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
