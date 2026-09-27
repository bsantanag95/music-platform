export {}; // fuerza module scope
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { SMOKE_PREFIX, smokeMbid } from "./smoke-album-fixtures";

assertSmokeAllowed();

// Smoke test de la discografía de artista contra Postgres real (openspec:
// fix-artist-discography-ingestion). Mockea `global.fetch` con un browse sintético
// paginado (MBID `5e0ce000-0000-4000-8000-*`) y verifica: ingesta paginada con tipos
// crudos, marca de release-groups fuera de la discografía sin borrarlos, release-group
// que vuelve, primera visita parcial de un artista con más de 300, sincronización
// interrumpida sin marcas, simulación sin escritura y secciones. Borra sus fixtures al
// terminar (también si falla).

let failures = 0;
function check(condition: boolean, message: string) {
  console.log(`${condition ? "✅" : "❌"} ${message}`);
  if (!condition) failures++;
}

const BAND = smokeMbid(SMOKE_PREFIX, 0x5001);
const BIG_BAND = smokeMbid(SMOKE_PREFIX, 0x5002);
const OTHER_ARTIST = smokeMbid(SMOKE_PREFIX, 0x5003);
const BOOTLEG = smokeMbid(SMOKE_PREFIX, 0x3fff);
const bandGroup = (n: number) => smokeMbid(SMOKE_PREFIX, 0x3000 + n);
const bigGroup = (n: number) => smokeMbid(SMOKE_PREFIX, 0x4000 + n);

type RgType = { primary: string; secondary: string[]; featured?: boolean };

/** Tipos cíclicos para cubrir las secciones: estudio, EP, sencillo, en vivo, recopilatorio, remix, aparición. */
const TYPE_CYCLE: RgType[] = [
  { primary: "Album", secondary: [] },
  { primary: "EP", secondary: [] },
  { primary: "Single", secondary: [] },
  { primary: "Album", secondary: ["Live"] },
  { primary: "Album", secondary: ["Compilation"] },
  { primary: "Single", secondary: ["Remix"] },
  { primary: "Single", secondary: [], featured: true },
];

function releaseGroupOf(artistMbid: string, artistName: string, mbid: string, n: number) {
  const type = TYPE_CYCLE[n % TYPE_CYCLE.length]!;
  const self = { name: artistName, joinphrase: "", artist: { id: artistMbid, name: artistName } };
  const other = { name: "Otra banda (smoke)", joinphrase: " feat. ", artist: { id: OTHER_ARTIST, name: "Otra banda (smoke)" } };
  return {
    id: mbid,
    title: `Disco ${n} (smoke)`,
    "primary-type": type.primary,
    "secondary-types": type.secondary,
    "first-release-date": String(1990 + (n % 30)),
    "artist-credit": type.featured ? [other, { ...self, joinphrase: "" }] : [self],
  };
}

async function main() {
  const { db } = await import("../src/db");
  const schema = await import("../src/db/schema");
  const { and, eq, inArray, like, sql } = await import("drizzle-orm");
  const { upsertArtistFromMb } = await import("../src/services/catalog/ingest-artist");
  const { findOrIngestDiscography, readArtistDiscography, syncArtistDiscography } = await import(
    "../src/services/catalog/ingest-discography"
  );
  const { discographySection } = await import("../src/services/catalog/discography-sections");

  // Browse sintético: la banda chica tiene 150 release-groups (2 páginas) y la grande 320.
  const catalog: Record<string, ReturnType<typeof releaseGroupOf>[]> = {
    [BAND]: Array.from({ length: 150 }, (_, n) => releaseGroupOf(BAND, "Banda de discografía (smoke)", bandGroup(n), n)),
    [BIG_BAND]: Array.from({ length: 320 }, (_, n) => releaseGroupOf(BIG_BAND, "Banda grande (smoke)", bigGroup(n), n)),
  };
  let failOnOffset: number | null = null;
  const calls: string[] = [];
  const realFetch = global.fetch;
  global.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(input.toString());
    if (url.pathname !== "/ws/2/release-group") throw new Error(`No hay mock para: ${url.pathname}${url.search}`);
    const artistMbid = url.searchParams.get("artist")!;
    const offset = Number(url.searchParams.get("offset"));
    calls.push(`${artistMbid}@${offset}`);
    check(url.searchParams.get("release-group-status") === "website-default", `browse sin bootlegs (offset ${offset})`);
    if (failOnOffset === offset) return new Response("fallo simulado", { status: 500 });
    const all = catalog[artistMbid] ?? [];
    const body = { "release-group-count": all.length, "release-group-offset": offset, "release-groups": all.slice(offset, offset + 100) };
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;

  async function cleanup() {
    await db.delete(schema.releaseGroup).where(like(sql`${schema.releaseGroup.mbid}::text`, `${SMOKE_PREFIX}%`));
    await db.delete(schema.artist).where(like(sql`${schema.artist.mbid}::text`, `${SMOKE_PREFIX}%`));
  }

  async function artistRow(mbid: string) {
    const [row] = await db.select().from(schema.artist).where(eq(schema.artist.mbid, mbid));
    return row!;
  }

  try {
    await cleanup();
    const band = await upsertArtistFromMb(BAND, "Banda de discografía (smoke)", "Group");

    // Un bootleg guardado por la ingesta anterior, acreditado a la banda.
    const [bootleg] = await db
      .insert(schema.releaseGroup)
      .values({ mbid: BOOTLEG, title: "Bootleg (smoke)", category: "live_other" })
      .returning();
    await db.insert(schema.credit).values({ artistId: band.id, releaseGroupId: bootleg!.id, position: 0, role: "primary" });

    console.log("1) Primera visita: 2 páginas, tipos crudos y bootleg fuera de la discografía");
    const first = await findOrIngestDiscography(band);
    check(calls.filter((c) => c.startsWith(BAND)).length === 2, "dos requests paginadas (150 release-groups)");
    check(first.length === 150, `devuelve los 150 release-groups (${first.length})`);
    check(!first.some((row) => row.mbid === BOOTLEG), "el bootleg no aparece en la discografía");
    const refreshed = await artistRow(BAND);
    check(refreshed.discographyCompleteAt !== null, "la discografía queda completa");
    const [bootlegAfter] = await db.select().from(schema.releaseGroup).where(eq(schema.releaseGroup.mbid, BOOTLEG));
    check(bootlegAfter?.discographyUnlistedAt !== null, "el bootleg queda marcado, no borrado");
    const credits = await db.select().from(schema.credit).where(eq(schema.credit.releaseGroupId, bootleg!.id));
    check(credits.length === 1, "el bootleg conserva su crédito");
    const [ep] = await db.select().from(schema.releaseGroup).where(eq(schema.releaseGroup.mbid, bandGroup(1)));
    check(ep?.primaryType === "EP" && ep.secondaryTypes?.length === 0, "guarda los tipos crudos (EP sin secundarios)");

    const sections: Record<string, number> = {};
    for (const row of first) {
      const key = discographySection({
        primaryType: row.primaryType,
        secondaryTypes: row.secondaryTypes,
        category: row.category as "studio",
        creditRole: row.creditRole,
      });
      sections[key] = (sections[key] ?? 0) + 1;
    }
    check(
      // 150 = 7 × 21 + 3: estudio, EP y sencillo aparecen 22 veces; el resto, 21.
      sections.main === 44 && sections.singles === 22 && sections.live === 21 && sections.compilations === 21 && sections.other === 21 && sections.appearances === 21,
      `secciones desde los datos guardados (${JSON.stringify(sections)})`,
    );

    console.log("2) Una segunda lectura al día no llama a MusicBrainz");
    const before = calls.length;
    await findOrIngestDiscography(refreshed);
    check(calls.length === before, "sin requests");

    console.log("3) El bootleg vuelve cuando MusicBrainz lo devuelve");
    catalog[BAND]!.push(releaseGroupOf(BAND, "Banda de discografía (smoke)", BOOTLEG, 3));
    await db
      .update(schema.artist)
      .set({ discographyCompleteAt: sql`now() - interval '8 days'` })
      .where(eq(schema.artist.id, band.id));
    const relist = await syncArtistDiscography(band.id, { mode: "full" });
    check(relist.status === "complete" && relist.relisted === 1, `se desmarca (${JSON.stringify(relist)})`);
    check((await readArtistDiscography(band.id)).some((row) => row.mbid === BOOTLEG), "vuelve a la discografía");

    console.log("4) Sincronización interrumpida: no marca nada");
    catalog[BAND]!.pop();
    await db
      .update(schema.artist)
      .set({ discographyCompleteAt: sql`now() - interval '8 days'` })
      .where(eq(schema.artist.id, band.id));
    failOnOffset = 100;
    const interrupted = await syncArtistDiscography(band.id, { mode: "full" }).then(
      () => "sin error",
      () => "error",
    );
    failOnOffset = null;
    const [stillListed] = await db.select().from(schema.releaseGroup).where(eq(schema.releaseGroup.mbid, BOOTLEG));
    check(interrupted === "error" && stillListed?.discographyUnlistedAt === null, "falló sin marcar el bootleg");

    console.log("5) Simulación: informa sin escribir");
    const dry = await syncArtistDiscography(band.id, { mode: "full", dryRun: true });
    const [afterDry] = await db.select().from(schema.releaseGroup).where(eq(schema.releaseGroup.mbid, BOOTLEG));
    check(dry.status === "complete" && dry.unlisted === 1, `informa 1 fuera de la discografía (${JSON.stringify(dry)})`);
    check(afterDry?.discographyUnlistedAt === null, "no escribió la marca");

    console.log("6) Artista con más de 300: primera visita parcial y sincronización completa después");
    const big = await upsertArtistFromMb(BIG_BAND, "Banda grande (smoke)", "Group");
    const partial = await findOrIngestDiscography(big);
    check(calls.filter((c) => c.startsWith(BIG_BAND)).length === 3, "la primera visita pide 3 páginas");
    check(partial.length === 300, `devuelve 300 (${partial.length})`);
    const bigRow = await artistRow(BIG_BAND);
    check(bigRow.discographySyncedAt !== null && bigRow.discographyCompleteAt === null, "queda con datos pero incompleta");
    const full = await syncArtistDiscography(big.id, { mode: "full" });
    check(full.status === "complete" && full.saved === 320, `la sincronización completa guarda los 320 (${JSON.stringify(full)})`);
    const stored = await db
      .select({ id: schema.releaseGroup.id })
      .from(schema.releaseGroup)
      .innerJoin(schema.credit, eq(schema.credit.releaseGroupId, schema.releaseGroup.id))
      .where(and(eq(schema.credit.artistId, big.id), inArray(schema.credit.role, ["primary", "featured"])));
    check(stored.length === 320, `320 release-groups acreditados en la base (${stored.length})`);
  } finally {
    global.fetch = realFetch;
    await cleanup();
    console.log("\nFixtures borrados.");
  }

  console.log(failures === 0 ? "\n✅ Smoke test de discografía OK" : `\n❌ ${failures} verificación(es) fallaron`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
