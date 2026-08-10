// Smoke de integracion de la sincronizacion de memberships contra Postgres.
// Usa exclusivamente UUIDs sinteticos y mockea la salida a MusicBrainz.

export {};
import { and, eq, inArray } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";

assertSmokeAllowed();

const TARGET_ID = "d0000000-0000-4000-8000-000000000001";
const TARGET_MBID = "d0000000-0000-4000-8000-000000000011";
const RELATED_ID = "d0000000-0000-4000-8000-000000000002";
const RELATED_MBID = "d0000000-0000-4000-8000-000000000012";
const STALE_ID = "d0000000-0000-4000-8000-000000000003";
const OTHER_GROUP_ID = "d0000000-0000-4000-8000-000000000004";
const OTHER_GROUP_MBID = "d0000000-0000-4000-8000-000000000014";
const FAILURE_TARGET_ID = "d0000000-0000-4000-8000-000000000005";
const FAILURE_TARGET_MBID = "d0000000-0000-4000-8000-000000000015";
const FAILURE_PERSON_ID = "d0000000-0000-4000-8000-000000000006";

const fixtureIds = [TARGET_ID, RELATED_ID, STALE_ID, OTHER_GROUP_ID, FAILURE_TARGET_ID, FAILURE_PERSON_ID];
const fixtureMbids = [TARGET_MBID, RELATED_MBID, OTHER_GROUP_MBID, FAILURE_TARGET_MBID];

function relationResponse() {
  return {
    id: TARGET_MBID,
    name: "Grupo fixture principal",
    type: "Group",
    relations: [
      {
        type: "member of band",
        direction: "forward",
        artist: { id: RELATED_MBID, name: "Persona fixture nueva", type: "Person" },
        attributes: ["voz"],
        begin: "2001-01-01",
      },
    ],
  };
}

async function main() {
  const realFetch = global.fetch;
  let relationFetches = 0;
  let releaseFetch = () => {};
  global.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(input.toString());
    if (!url.pathname.endsWith(`/artist/${TARGET_MBID}`)) {
      throw new Error(`Fetch inesperado en smoke: ${url}`);
    }
    relationFetches += 1;
    releaseFetch();
    if (url.searchParams.get("inc") !== "artist-rels") {
      throw new Error(`Se esperaba inc=artist-rels: ${url}`);
    }
    return new Response(JSON.stringify(relationResponse()), { status: 200 });
  }) as typeof fetch;

  const { db } = await import("../src/db");
  const { artist, membership } = await import("../src/db/schema");
  const { ensureArtistMemberships, getArtistMemberships } = await import("../src/services/catalog/ingest-artist");

  async function clean() {
    await db.delete(artist).where(inArray(artist.id, fixtureIds));
    await db.delete(artist).where(inArray(artist.mbid, fixtureMbids));
  }

  try {
    await clean();
    await db.insert(artist).values([
      { id: TARGET_ID, mbid: TARGET_MBID, name: "Grupo fixture principal", type: "group" },
      { id: RELATED_ID, mbid: RELATED_MBID, name: "Persona fixture nueva", type: "person" },
      { id: STALE_ID, mbid: "d0000000-0000-4000-8000-000000000013", name: "Persona stale", type: "person" },
      { id: OTHER_GROUP_ID, mbid: OTHER_GROUP_MBID, name: "Otro grupo fixture", type: "group" },
      { id: FAILURE_TARGET_ID, mbid: FAILURE_TARGET_MBID, name: "Grupo fallo fixture", type: "group" },
      { id: FAILURE_PERSON_ID, mbid: "d0000000-0000-4000-8000-000000000016", name: "Persona fallo fixture", type: "person" },
    ]);
    await db.insert(membership).values([
      { personId: STALE_ID, groupId: TARGET_ID, role: "stale" },
      { personId: FAILURE_PERSON_ID, groupId: FAILURE_TARGET_ID, role: "preservar" },
      { personId: STALE_ID, groupId: OTHER_GROUP_ID, role: "otro artista" },
    ]);

    const [target] = await db.select().from(artist).where(eq(artist.id, TARGET_ID));
    if (!target) throw new Error("No se pudo crear el fixture principal");

    await ensureArtistMemberships(target);
    const firstMemberships = await getArtistMemberships(target);
    if (relationFetches !== 1 || firstMemberships.length !== 1 || firstMemberships[0]?.artistId !== RELATED_ID) {
      throw new Error(`La sincronizacion fria no produjo el resultado esperado: ${JSON.stringify(firstMemberships)}`);
    }

    await ensureArtistMemberships(target);
    if (relationFetches !== 1) throw new Error("La segunda llamada cacheada hizo fetch externo");
    const [synced] = await db.select({ value: artist.membershipsSyncedAt }).from(artist).where(eq(artist.id, TARGET_ID));
    if (!synced?.value) throw new Error("La sincronizacion fria no marco memberships_synced_at");

    await db.update(artist).set({ membershipsSyncedAt: null }).where(eq(artist.id, TARGET_ID));
    let resolveFetch!: () => void;
    const fetchStarted = new Promise<void>((resolve) => { resolveFetch = resolve; });
    releaseFetch = resolveFetch;
    const concurrent = Promise.all([ensureArtistMemberships(target), ensureArtistMemberships(target)]);
    await fetchStarted;
    await concurrent;
    const concurrentFetches = Number(relationFetches);
    if (concurrentFetches !== 2) throw new Error(`El advisory lock permitio ${concurrentFetches - 1} fetches duplicados`);

    const otherMemberships = await db.select().from(membership).where(eq(membership.groupId, OTHER_GROUP_ID));
    if (otherMemberships.length !== 1 || otherMemberships[0]?.personId !== STALE_ID) {
      throw new Error("La reconciliacion altero memberships de otro artista");
    }

    const originalFetch = global.fetch;
    global.fetch = (async () => { throw new Error("MusicBrainz fixture caido"); }) as typeof fetch;
    const [failureTarget] = await db.select().from(artist).where(eq(artist.id, FAILURE_TARGET_ID));
    if (!failureTarget) throw new Error("No se pudo crear el fixture de fallo");
    await expectFailure(() => ensureArtistMemberships(failureTarget));
    global.fetch = originalFetch;
    const [failed] = await db.select({ value: artist.membershipsSyncedAt }).from(artist).where(eq(artist.id, FAILURE_TARGET_ID));
    const preserved = await db.select().from(membership).where(and(eq(membership.personId, FAILURE_PERSON_ID), eq(membership.groupId, FAILURE_TARGET_ID)));
    if (failed?.value !== null || preserved.length !== 1) {
      throw new Error("El fallo externo no dejo el flag NULL y la transaccion intacta");
    }

    console.log("Membership sync smoke OK: frio, cache, lock, stale selectivo y rollback externo");
  } finally {
    global.fetch = realFetch;
    await clean();
  }
}

async function expectFailure(operation: () => Promise<void>) {
  try {
    await operation();
  } catch {
    return;
  }
  throw new Error("Se esperaba un fallo externo");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
