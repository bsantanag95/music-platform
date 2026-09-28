export {}; // fuerza module scope
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { SMOKE_PREFIX, smokeMbid } from "./smoke-album-fixtures";

assertSmokeAllowed();

// Smoke test de la alineación de un artista contra Postgres real (openspec:
// add-artist-lineup-data). Mockea `global.fetch` para MusicBrainz con respuestas sintéticas
// (MBID `5e0ce000-0000-4000-8000-*`) y verifica: períodos por relación con las marcas aparte y
// una sola request; músicos de apoyo, también de un solista; la clasificación y la lectura; la
// sincronización de integrantes (otras bandas y fecha de muerte) sin tocar al resto de la banda;
// la actualización que suma y quita integrantes; y los CHECK de la migración 0055. Borra sus
// fixtures al terminar (también si falla).

let failures = 0;
function check(condition: boolean, message: string) {
  console.log(`${condition ? "✅" : "❌"} ${message}`);
  if (!condition) failures++;
}

const BAND = smokeMbid(SMOKE_PREFIX, 0x7001);
const RETURNER = smokeMbid(SMOKE_PREFIX, 0x7002);
const LATE = smokeMbid(SMOKE_PREFIX, 0x7003);
const TOURING = smokeMbid(SMOKE_PREFIX, 0x7004);
const NEWCOMER = smokeMbid(SMOKE_PREFIX, 0x7005);
const OTHER_BAND = smokeMbid(SMOKE_PREFIX, 0x7010);
const SOLOIST = smokeMbid(SMOKE_PREFIX, 0x7011);

const person = (id: string, name: string) => ({ id, name, type: "Person" });
const group = (id: string, name: string) => ({ id, name, type: "Group" });
const rel = (type: string, direction: string, artist: object, attributes: string[], begin: string | null, end: string | null, ended: boolean) => ({
  type,
  "target-type": "artist",
  direction,
  attributes,
  begin,
  end,
  ended,
  artist,
});

const band = group(BAND, "Banda de alineación (smoke)");
const returner = person(RETURNER, "Vuelve (smoke)");
const late = person(LATE, "Fallecido (smoke)");
const touring = person(TOURING, "De gira (smoke)");
const newcomer = person(NEWCOMER, "Recién llegado (smoke)");

let bandRelations = [
  rel("member of band", "backward", returner, ["lead vocals", "original"], "1981", "1992", true),
  rel("member of band", "backward", returner, ["lead vocals", "original"], "1997", null, false),
  rel("member of band", "backward", late, ["drums (drum set)"], "1999", "2002-03-26", true),
  rel("instrumental supporting musician", "backward", touring, ["drums (drum set)"], "2000", "2002", true),
];

const responses: Record<string, () => object> = {
  [BAND]: () => ({ ...band, "life-span": { begin: "1981", end: null, ended: false }, relations: bandRelations }),
  [RETURNER]: () => ({ ...returner, "life-span": { begin: "1961", ended: false }, relations: bandRelations.filter((r) => r.artist === returner).map((r) => ({ ...r, direction: "forward", artist: band })) }),
  [LATE]: () => ({
    ...late,
    "life-span": { begin: "1950", end: "2002-03-26", ended: true },
    relations: [
      rel("member of band", "forward", band, ["drums (drum set)"], "1999", "2002-03-26", true),
      // Abierta en MusicBrainz aunque murió: debe figurar como antigua.
      rel("member of band", "forward", group(OTHER_BAND, "Otra banda (smoke)"), [], null, null, false),
      rel("instrumental supporting musician", "forward", person(SOLOIST, "Solista (smoke)"), ["drums (drum set)"], "1983", "1993", true),
    ],
  }),
  [TOURING]: () => ({ ...touring, "life-span": {}, relations: [rel("instrumental supporting musician", "forward", band, ["drums (drum set)"], "2000", "2002", true)] }),
  [NEWCOMER]: () => ({ ...newcomer, "life-span": {}, relations: [rel("member of band", "forward", band, ["guitar"], "2022", null, false)] }),
};

async function main() {
  const { db } = await import("../src/db");
  const schema = await import("../src/db/schema");
  const { and, eq, like, sql } = await import("drizzle-orm");
  const { upsertArtistFromMb, ensureArtistMemberships } = await import("../src/services/catalog/ingest-artist");
  const { syncArtistProfileFacts } = await import("../src/services/catalog/artist-profile");
  const { getArtistLineup } = await import("../src/services/catalog/artist-lineup");
  const { syncLineupMembers } = await import("../src/services/catalog/artist-lineup-sync");

  const calls: string[] = [];
  const realFetch = global.fetch;
  global.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(input.toString());
    if (url.hostname !== "musicbrainz.org") throw new Error(`No hay mock para: ${url}`);
    const mbid = url.pathname.split("/").at(-1)!;
    calls.push(mbid);
    const response = responses[mbid];
    if (!response) throw new Error(`No hay mock para el artista ${mbid}`);
    return new Response(JSON.stringify(response()), { status: 200 });
  }) as typeof fetch;

  async function cleanup() {
    await db.delete(schema.artist).where(like(sql`${schema.artist.mbid}::text`, `${SMOKE_PREFIX}%`));
  }
  const idOf = async (mbid: string) => (await db.select({ id: schema.artist.id }).from(schema.artist).where(eq(schema.artist.mbid, mbid)))[0]!.id;
  const constraintError = (e: { cause?: { code?: string }; code?: string }) => e.cause?.code ?? e.code ?? "error";

  try {
    await cleanup();
    const bandRow = await upsertArtistFromMb(BAND, band.name, "Group");

    console.log("1) Sincronización fría: períodos, marcas y apoyo con una sola request");
    await ensureArtistMemberships(bandRow);
    check(calls.length === 1, "una sola request a MusicBrainz");
    const returnerId = await idOf(RETURNER);
    const [pair] = await db
      .select()
      .from(schema.membership)
      .where(and(eq(schema.membership.groupId, bandRow.id), eq(schema.membership.personId, returnerId)));
    check(pair?.role === "lead vocals", `el resumen no incluye "original" (${pair?.role})`);
    const periods = await db.select().from(schema.membershipPeriod).where(eq(schema.membershipPeriod.membershipId, pair!.id));
    check(periods.length === 2 && periods.every((p) => p.isFounder), "dos períodos con la marca de fundador");
    check(periods.some((p) => p.beginDate === "1997" && p.endDate === null && !p.ended), "el período abierto conserva su precisión");
    const supports = await db.select().from(schema.artistSupport).where(eq(schema.artistSupport.artistId, bandRow.id));
    check(supports.length === 1 && supports[0]!.kind === "instrumental", "músico de apoyo guardado aparte");
    const synced = (await db.select().from(schema.artist).where(eq(schema.artist.id, bandRow.id)))[0]!;
    check(synced.lineupSyncedAt !== null, "lineup_synced_at marcado");

    console.log("2) Lectura: clasificación y pendientes");
    let lineup = await getArtistLineup(bandRow.id);
    if (lineup?.kind !== "group") throw new Error("se esperaba un grupo");
    check(lineup.current.map((p) => p.name).join() === returner.name, "actual: quien volvió");
    check(lineup.past.map((p) => p.name).join() === late.name, "antiguo: el que se fue");
    check(lineup.supportPast.map((p) => p.name).join() === touring.name, "apoyo anterior");
    check(lineup.pending === 3, `tres personas pendientes (${lineup.pending})`);

    console.log("3) Sincronización de integrantes: otras bandas y fecha de muerte, sin tocar al resto");
    const before = await db.select().from(schema.membership).where(eq(schema.membership.groupId, bandRow.id));
    const result = await syncLineupMembers(bandRow.id);
    check(result.synced === 3 && result.failed === 0, `tres personas sincronizadas (${JSON.stringify(result)})`);
    const after = await db.select().from(schema.membership).where(eq(schema.membership.groupId, bandRow.id));
    check(after.length === before.length, "las pertenencias de la banda siguen completas");
    lineup = await getArtistLineup(bandRow.id);
    if (lineup?.kind !== "group") throw new Error("se esperaba un grupo");
    const lateEntry = lineup.past[0]!;
    check(lateEntry.deathYear === 2002, `año de muerte (${lateEntry.deathYear})`);
    check(
      JSON.stringify(lateEntry.affiliations.map((a) => [a.name, a.current, a.support])) ===
        JSON.stringify([["Otra banda (smoke)", false, false], ["Solista (smoke)", false, true]]),
      `otras afiliaciones sin la banda vista, antigua aunque MusicBrainz la deje abierta (${JSON.stringify(lateEntry.affiliations)})`,
    );
    check(lineup.pending === 0, "sin pendientes");
    const calledBefore = calls.length;
    await syncLineupMembers(bandRow.id);
    check(calls.length === calledBefore, "una segunda corrida no repite requests de personas al día");

    console.log("4) Apoyo a un solista");
    const soloist = await getArtistLineup(await idOf(SOLOIST));
    if (soloist?.kind !== "person") throw new Error("se esperaba una persona");
    check(soloist.supportersPast.map((p) => p.name).join() === late.name, "el solista tiene al fallecido como músico de apoyo");

    console.log("5) Actualización: suma y quita integrantes con la request de la ficha");
    bandRelations = [
      ...bandRelations.filter((r) => r.artist !== late),
      rel("member of band", "backward", newcomer, ["guitar"], "2022", null, false),
    ];
    await db.update(schema.artist).set({ profileSyncedAt: sql`now() - interval '31 days'` }).where(eq(schema.artist.id, bandRow.id));
    check((await syncArtistProfileFacts(bandRow.id)).status === "synced", "la ficha vencida se actualiza");
    lineup = await getArtistLineup(bandRow.id);
    if (lineup?.kind !== "group") throw new Error("se esperaba un grupo");
    check(lineup.current.some((p) => p.name === newcomer.name), "el integrante nuevo aparece");
    check(!lineup.past.some((p) => p.name === late.name), "la relación retirada en MusicBrainz desaparece");

    console.log("6) Restricciones de la migración 0055");
    const orderCheck = await db
      .insert(schema.membershipPeriod)
      .values({ membershipId: pair!.id, beginDate: "2010", endDate: "2005", ended: true })
      .then(() => null)
      .catch(constraintError);
    check(orderCheck === "23514", `un período invertido viola chk_membership_period_order (${orderCheck})`);
    const kindCheck = await db
      .insert(schema.artistSupport)
      .values({ musicianId: returnerId, artistId: bandRow.id, kind: "live" })
      .then(() => null)
      .catch(constraintError);
    check(kindCheck === "23514", `un tipo de apoyo desconocido viola chk_artist_support_kind (${kindCheck})`);
  } finally {
    global.fetch = realFetch;
    await cleanup();
    console.log("\nFixtures borrados.");
  }

  console.log(failures === 0 ? "\n✅ Smoke test de alineación de artista OK" : `\n❌ ${failures} verificación(es) fallaron`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
