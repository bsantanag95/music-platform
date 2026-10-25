export {};

// Smoke test de los cambios add-home-release-calendar y
// add-notification-milestones-and-releases contra Postgres REAL (el SQL que las pruebas
// unitarias no cubren): la migración 0063, la sincronización completa (feed, popularidad,
// verificación por lote, vínculo al catálogo, carátulas), las exclusiones (en vivo, reedición, sin
// carátula, no encontrado, sencillo), que solo lo mostrado entra al catálogo, la selección personal
// (seguido sin carátula como "Anunciado", próximos del catálogo más allá del feed, relleno
// "Destacado"), el reemplazo de la ventana, que un fallo conserva el calendario, el lock y, desde
// add-notification-milestones-and-releases, los avisos de lanzamiento (seguidor, colaboración,
// repetición, ventana de 14 días, anunciado, sencillo con y sin opción, reedición, riel sin
// sencillos y fan-out de 500 seguidores).
//
// Mockea ListenBrainz, MusicBrainz y Cover Art Archive (no sale a internet). Crea artistas y
// release-groups con MBID `5e0ce000-0000-4000-8000-000000008*` y usuarios `smoke_cal_*`. Respalda el
// calendario existente y lo restaura al terminar; borra sus fixtures también si falla. Si se
// interrumpió, limpiar con
//   DELETE FROM app_user WHERE username LIKE 'smoke_cal_%';
//   DELETE FROM release_calendar_entry WHERE release_group_mbid::text LIKE '5e0ce000%';
//   DELETE FROM release_group WHERE mbid::text LIKE '5e0ce000%';
//   DELETE FROM artist WHERE mbid::text LIKE '5e0ce000%';
// y volver a sincronizar el calendario (`scripts/sync-release-calendar.ts`).
// Necesita las migraciones 0063 y 0076 aplicadas. Correr contra una BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-release-calendar.ts

import { randomUUID } from "node:crypto";
import { and, eq, inArray, like, sql } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import {
  appUser,
  artist,
  artistFollow,
  credit,
  favorite,
  notification,
  notificationPreference,
  releaseCalendarEntry,
  releaseCalendarSync,
  releaseGroup,
} from "../src/db/schema";
import type { NotificationKind } from "../src/db/schema";
import * as sync from "../src/services/home/release-calendar-sync";
import * as read from "../src/services/home/release-calendar-read";
import { addDays, isoDay } from "../src/services/home/release-calendar";

assertSmokeAllowed();

// Sin espejo de carátulas: la URL resuelta es la de CAA y no se escribe en el storage (los
// clientes y el espejo leen estas variables al llamarse, no al importarse).
delete process.env.COVER_ART_TAKEDOWN_EMAIL;
process.env.LISTENBRAINZ_USER_AGENT ??= "music-platform-smoke ( smoke@example.test )";
process.env.MUSICBRAINZ_USER_AGENT ??= "music-platform-smoke ( smoke@example.test )";


const suffix = randomUUID().slice(0, 8);
const TODAY = isoDay(new Date());
const artistMbid = (n: number) => `5e0ce000-0000-4000-8000-0000000080${String(n).padStart(2, "0")}`;
const rgMbid = (n: number) => `5e0ce000-0000-4000-8000-0000000081${String(n).padStart(2, "0")}`;

function check(condition: unknown, message: string): void {
  if (!condition) throw new Error(`FALLÓ: ${message}`);
  console.log(`  ✓ ${message}`);
}

// ---------------------------------------------------------------------------
// Fixtures del feed. `mb`: lo que devuelve la búsqueda por lote de MusicBrainz (ausente = no
// encontrado). `cover`: si Cover Art Archive sirve la miniatura.
interface Fixture {
  rg: number;
  artist: number;
  name: string;
  title: string;
  days: number;
  type: string;
  caa: boolean;
  listeners: number;
  mb?: { secondary?: string[]; first?: string };
  cover: boolean;
}

const FIXTURES: Fixture[] = [
  { rg: 1, artist: 1, name: "Smoke Cal Popular", title: "Reciente", days: -3, type: "Album", caa: true, listeners: 500_000, mb: {}, cover: true },
  { rg: 2, artist: 2, name: "Smoke Cal Vivo", title: "En vivo", days: 10, type: "Album", caa: true, listeners: 400_000, mb: { secondary: ["Live"] }, cover: true },
  { rg: 3, artist: 3, name: "Smoke Cal Reedicion", title: "Reedición", days: 12, type: "Album", caa: true, listeners: 300_000, mb: { first: "1994-05-02" }, cover: true },
  { rg: 4, artist: 4, name: "Smoke Cal Seguido", title: "Anunciado", days: 45, type: "Album", caa: false, listeners: 10, mb: {}, cover: false },
  { rg: 5, artist: 5, name: "Smoke Cal Sin CAA", title: "Sin miniatura", days: 8, type: "EP", caa: true, listeners: 250_000, mb: {}, cover: false },
  { rg: 6, artist: 6, name: "Smoke Cal Sencillo", title: "Sencillo", days: -2, type: "Single", caa: true, listeners: 900_000, mb: {}, cover: true },
  { rg: 7, artist: 7, name: "Smoke Cal Doble", title: "Doble A", days: 20, type: "Album", caa: true, listeners: 200_000, mb: {}, cover: true },
  { rg: 8, artist: 7, name: "Smoke Cal Doble", title: "Doble B", days: 25, type: "Album", caa: true, listeners: 200_000, mb: {}, cover: true },
  { rg: 9, artist: 9, name: "Smoke Cal Fantasma", title: "No indexado", days: 15, type: "Album", caa: true, listeners: 150_000, cover: true },
  { rg: 10, artist: 10, name: "Smoke Cal Medio", title: "Próximo medio", days: 30, type: "EP", caa: true, listeners: 50_000, mb: {}, cover: true },
  { rg: 11, artist: 11, name: "Smoke Cal Viejo", title: "Fuera de 14 días", days: -20, type: "Album", caa: false, listeners: 0, mb: {}, cover: false },
];

let feedMode: "normal" | "without-popular" | "fail" = "normal";
let mbRequests = 0;

function feedRows(): unknown[] {
  return FIXTURES.filter((f) => !(feedMode === "without-popular" && f.rg === 1)).map((f) => ({
    artist_credit_name: f.name,
    artist_mbids: [artistMbid(f.artist)],
    caa_id: f.caa ? 1000 + f.rg : null,
    caa_release_mbid: f.caa ? rgMbid(f.rg) : null,
    listen_count: 0,
    release_date: addDays(TODAY, f.days),
    release_group_mbid: rgMbid(f.rg),
    release_group_primary_type: f.type,
    release_mbid: rgMbid(f.rg),
    release_name: f.title,
    release_tags: [],
  }));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input instanceof Request ? input.url : input));
  if (url.hostname === "api.listenbrainz.org") {
    if (feedMode === "fail") return json({ error: "boom" }, 500);
    if (url.pathname === "/1/explore/fresh-releases/") {
      const past = url.searchParams.get("past") === "true";
      const rows = feedRows().filter((row) => {
        const date = (row as { release_date: string }).release_date;
        return past ? date <= TODAY : date >= TODAY;
      });
      return json({ payload: { releases: rows, total_count: rows.length } });
    }
    if (url.pathname === "/1/popularity/artist") {
      const { artist_mbids } = JSON.parse(String(init?.body)) as { artist_mbids: string[] };
      return json(
        artist_mbids.map((mbid) => {
          const fixture = FIXTURES.find((f) => artistMbid(f.artist) === mbid);
          return { artist_mbid: mbid, total_listen_count: null, total_user_count: fixture?.listeners ?? null };
        }),
      );
    }
  }
  if (url.hostname === "musicbrainz.org" && url.pathname === "/ws/2/release-group") {
    mbRequests++;
    const ids = (url.searchParams.get("query") ?? "").match(/[0-9a-f-]{36}/g) ?? [];
    const items = ids.flatMap((id) => {
      const f = FIXTURES.find((x) => rgMbid(x.rg) === id);
      if (!f?.mb) return [];
      return [
        {
          id,
          title: f.title,
          "primary-type": f.type,
          "secondary-types": f.mb.secondary ?? [],
          "first-release-date": f.mb.first ?? addDays(TODAY, f.days),
          "artist-credit": [{ name: f.name, joinphrase: "", artist: { id: artistMbid(f.artist), name: f.name } }],
        },
      ];
    });
    return json({ count: items.length, offset: 0, "release-groups": items });
  }
  if (url.hostname === "coverartarchive.org") {
    const id = url.pathname.split("/")[2];
    const f = FIXTURES.find((x) => rgMbid(x.rg) === id);
    return f?.cover ? new Response(new Uint8Array([1, 2, 3]), { status: 200 }) : new Response(null, { status: 404 });
  }
  throw new Error(`fetch inesperado en el smoke test: ${url.href}`);
}) as typeof fetch;

// ---------------------------------------------------------------------------

async function rgIdByMbid(n: number): Promise<string | null> {
  const [row] = await db.select({ id: releaseGroup.id }).from(releaseGroup).where(eq(releaseGroup.mbid, rgMbid(n)));
  return row?.id ?? null;
}

async function countNotif(
  recipientId: string,
  kind: NotificationKind,
  releaseGroupId?: string | null,
): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notification)
    .where(
      and(
        eq(notification.recipientId, recipientId),
        eq(notification.kind, kind),
        releaseGroupId ? eq(notification.releaseGroupId, releaseGroupId) : undefined,
      ),
    );
  return row?.n ?? 0;
}

async function main() {
  // Respaldo del calendario existente (se restaura en `finally`).
  const backupEntries = await db.select().from(releaseCalendarEntry);
  const backupSyncIds = (await db.select({ id: releaseCalendarSync.id }).from(releaseCalendarSync)).map((r) => r.id);
  const follower = { id: randomUUID(), username: `smoke_cal_fan_${suffix}`, email: `smoke_cal_fan_${suffix}@example.test` };
  const releaseFan = { id: randomUUID(), username: `smoke_cal_rel_${suffix}`, email: `smoke_cal_rel_${suffix}@example.test` };
  const newcomer = { id: randomUUID(), username: `smoke_cal_new_${suffix}`, email: `smoke_cal_new_${suffix}@example.test` };
  const collabFan = { id: randomUUID(), username: `smoke_cal_collab_${suffix}`, email: `smoke_cal_collab_${suffix}@example.test` };
  const oldFan = { id: randomUUID(), username: `smoke_cal_old_${suffix}`, email: `smoke_cal_old_${suffix}@example.test` };

  try {
    console.log("Preparación");
    await db.insert(appUser).values([follower, releaseFan, newcomer, collabFan, oldFan]);
    // Artistas seguidos: el 4 anuncia a 45 días, el 1 publica un álbum reciente, el 3 solo reedita,
    // el 6 publica un sencillo y el 11 publica fuera de la ventana de 14 días. `follower` sigue solo
    // al 4 para que el riel personal conserve el orden por peso; `releaseFan` recibe los avisos.
    const followedArtists = await db
      .insert(artist)
      .values(
        [1, 3, 4, 6, 11].map((n) => ({
          mbid: artistMbid(n),
          type: "group",
          name: FIXTURES.find((f) => f.artist === n)!.name,
        })),
      )
      .returning({ id: artist.id, mbid: artist.mbid });
    const artistIdByMbid = new Map(followedArtists.map((row) => [row.mbid, row.id]));
    const followed = { id: artistIdByMbid.get(artistMbid(4))! };
    await db.insert(artistFollow).values([
      { userId: follower.id, artistId: followed.id },
      ...[1, 4, 6].map((n) => ({ userId: releaseFan.id, artistId: artistIdByMbid.get(artistMbid(n))! })),
      { userId: collabFan.id, artistId: followed.id },
      ...[3, 11].map((n) => ({ userId: oldFan.id, artistId: artistIdByMbid.get(artistMbid(n))! })),
    ]);
    const [far] = await db
      .insert(releaseGroup)
      .values({
        mbid: rgMbid(90),
        title: "Lejano",
        category: "studio",
        primaryType: "Album",
        firstReleaseDate: addDays(TODAY, 150),
        firstReleaseYear: Number(addDays(TODAY, 150).slice(0, 4)),
      })
      .returning();
    await db.insert(credit).values({ artistId: followed.id, releaseGroupId: far!.id, position: 0, role: "primary" });
    check(true, "usuarios, artistas seguidos y disco del catálogo a 150 días creados");

    console.log("Lock");
    const [running] = await db.insert(releaseCalendarSync).values({}).returning();
    check((await sync.syncReleaseCalendar({ today: TODAY })).status === "skipped", "con otra sincronización en curso no se hace nada");
    await db.delete(releaseCalendarSync).where(eq(releaseCalendarSync.id, running!.id));

    console.log("Primera sincronización");
    const first = await sync.syncReleaseCalendar({ today: TODAY });
    check(first.status === "succeeded", `la sincronización termina bien (${JSON.stringify(first)})`);
    check(mbRequests <= 3, `los finalistas se verifican con pocas búsquedas por lote, una por vuelta (requests: ${mbRequests})`);
    const entries = await db
      .select()
      .from(releaseCalendarEntry)
      .where(like(sql`${releaseCalendarEntry.releaseGroupMbid}::text`, "5e0ce000%"));
    const byRg = new Map(entries.map((e) => [e.releaseGroupMbid, e]));
    check(entries.length === FIXTURES.length - 1, "el calendario guarda álbumes y EPs (el sencillo queda fuera)");
    check(!byRg.has(rgMbid(6)), "el sencillo no es candidato");
    check(byRg.get(rgMbid(2))?.exclusion === "secondary_type", "el disco en vivo queda excluido por tipo secundario");
    check(byRg.get(rgMbid(3))?.exclusion === "reissue", "la reedición de 1994 queda excluida");
    check(byRg.get(rgMbid(9))?.verifiedAt === null, "el disco que MusicBrainz no devuelve queda sin verificar");
    check(byRg.get(rgMbid(4))?.hasCover === false, "el anunciado sin carátula se guarda con has_cover = false");

    const anonymous = await read.listAnonymousReleases(TODAY);
    const titles = anonymous.map((r) => r.title);
    console.log(`    selección anónima: ${titles.join(", ")}`);
    check(titles.includes("Reciente") && titles.includes("Próximo medio"), "la selección anónima incluye los válidos con carátula");
    check(!titles.includes("En vivo") && !titles.includes("Reedición"), "excluye el disco en vivo y la reedición");
    check(!titles.includes("Sin miniatura"), "excluye el disco cuya carátula CAA no confirma");
    check(!titles.includes("No indexado") && !titles.includes("Anunciado"), "excluye el no encontrado y el sin carátula");
    check(titles.filter((t) => t.startsWith("Doble")).length === 1, "un solo disco por artista");
    check(titles[0] === "Reciente", "los recientes van primero en el orden de la selección");
    check(anonymous.every((r) => r.coverThumbUrl && r.badge === null), "todas las tarjetas anónimas tienen carátula y sin marca");
    check(anonymous.find((r) => r.title === "Reciente")?.section === "recent", "un disco de hace 3 días es reciente");

    const notShown = titles.includes("Doble A") ? 8 : 7;
    check((await rgIdByMbid(notShown)) === null, "el candidato no elegido no entra al catálogo");
    check((await rgIdByMbid(2)) === null && (await rgIdByMbid(3)) === null, "los excluidos no entran al catálogo");
    check((await rgIdByMbid(1)) !== null, "el disco mostrado se registra como release-group");
    check((await rgIdByMbid(4)) !== null, "el disco de un artista seguido se vincula aunque no se muestre a anónimos");

    console.log("Avisos de lanzamiento");
    const rg1 = await rgIdByMbid(1);
    const rg4 = await rgIdByMbid(4);
    const rg11 = await rgIdByMbid(11);
    check(await countNotif(releaseFan.id, "artist_release", rg1), "quien sigue al artista recibe el álbum publicado");
    check((await countNotif(releaseFan.id, "artist_release_announced")) === 0, "el anunciado no avisa con su defecto desactivado");
    check((await countNotif(releaseFan.id, "artist_single")) === 0, "el sencillo no avisa con su defecto desactivado");
    check((await rgIdByMbid(6)) === null, "sin nadie que pida sencillos, el sencillo no se vincula");
    check((await countNotif(releaseFan.id, "artist_release")) === 1, "solo el disco reciente genera artist_release");
    check(
      (await countNotif(oldFan.id, "artist_release", rg11)) === 0,
      "un disco de hace 20 días queda fuera de la ventana de 14",
    );
    check(
      (await countNotif(oldFan.id, "artist_release")) === 0,
      "la reedición excluida no genera aviso",
    );

    // El sencillo y el anunciado solo se emiten si la persona los activó.
    await db.insert(notificationPreference).values([
      { userId: releaseFan.id, kind: "artist_release_announced", enabled: true },
      { userId: releaseFan.id, kind: "artist_single", enabled: true },
    ]);
    const withOptions = await sync.syncReleaseCalendar({ today: TODAY });
    check(withOptions.status === "succeeded", "la sincronización con los avisos activados termina bien");
    check((await countNotif(releaseFan.id, "artist_release_announced", rg4)) === 1, "activado, el anunciado avisa");
    check((await countNotif(releaseFan.id, "artist_single")) === 1, "activado, el sencillo avisa");
    check((await rgIdByMbid(6)) !== null, "con la opción activa, el sencillo se verifica y vincula");
    const singleEntry = await db
      .select({ id: releaseCalendarEntry.id })
      .from(releaseCalendarEntry)
      .where(eq(releaseCalendarEntry.releaseGroupMbid, rgMbid(6)));
    check(singleEntry.length === 0, "el sencillo sigue fuera del calendario");
    check(!(await read.listAnonymousReleases(TODAY)).some((r) => r.title === "Sencillo"), "y fuera del riel");
    check((await countNotif(releaseFan.id, "artist_release", rg1)) === 1, "repetir la sincronización no duplica el aviso");

    // Colaboración: el disco acredita como principal a un segundo artista seguido por otra persona.
    await db.insert(credit).values({ artistId: followed.id, releaseGroupId: rg1!, position: 1, role: "primary" });
    const collaboration = await sync.syncReleaseCalendar({ today: TODAY });
    check(collaboration.status === "succeeded", "la sincronización de la colaboración termina bien");
    check(
      (await countNotif(collabFan.id, "artist_release", rg1)) === 1,
      "quien sigue al segundo artista principal recibe el aviso",
    );
    check(
      (await countNotif(collabFan.id, "artist_release_announced")) === 0 &&
        (await countNotif(collabFan.id, "artist_single")) === 0,
      "la colaboración no arrastra los tipos que la persona no activó",
    );

    // Fan-out: 500 seguidores del artista reciben el mismo disco sin una fila por seguidor en memoria.
    const bulkFans = Array.from({ length: 500 }, (_, index) => ({
      id: randomUUID(),
      username: `smoke_cal_bulk${index}_${suffix}`,
      email: `smoke_cal_bulk${index}_${suffix}@example.test`,
    }));
    await db.insert(appUser).values(bulkFans);
    await db
      .insert(artistFollow)
      .values(bulkFans.map((user) => ({ userId: user.id, artistId: artistIdByMbid.get(artistMbid(1))! })));
    const started = performance.now();
    const fanOut = await sync.syncReleaseCalendar({ today: TODAY });
    const elapsed = performance.now() - started;
    check(fanOut.status === "succeeded", `el fan-out de 500 seguidores termina bien (${elapsed.toFixed(0)} ms)`);
    check((await countNotif(bulkFans[0]!.id, "artist_release", rg1)) === 1, "cada seguidor recibe su aviso");
    const [rg1Total] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(notification)
      .where(and(eq(notification.kind, "artist_release"), eq(notification.releaseGroupId, rg1!)));
    check(rg1Total!.n >= 500, `el disco reúne al menos 500 avisos (${rg1Total!.n})`);

    console.log("Selección personal");
    // Favorito de artista: relación de peso menor que seguir.
    const [popular] = await db.select({ id: artist.id }).from(artist).where(eq(artist.mbid, artistMbid(1)));
    check(popular, "el artista del disco mostrado entró al catálogo con sus créditos");
    await db.insert(favorite).values({ userId: follower.id, artistId: popular!.id });
    const personal = await read.listPersonalReleases(follower.id, TODAY);
    console.log(`    riel personal: ${personal.map((r) => `${r.title}${r.badge ? ` [${r.badge}]` : ""}`).join(", ")}`);
    check(personal[0]?.title === "Anunciado" && personal[0]?.badge === "announced", "el seguido sin carátula va primero con «Anunciado»");
    check(personal[1]?.title === "Lejano" && personal[1]?.section === "upcoming", "el anunciado del catálogo a 150 días aparece");
    check(personal[2]?.title === "Reciente" && personal[2]?.badge === null, "el favorito va después del seguido, sin marca");
    check(personal.length === 3, "la vista personal trae solo lo propio: no se rellena con la selección anónima");
    check(new Set(personal.map((r) => r.id)).size === personal.length, "sin discos repetidos");

    const fresh = await read.listPersonalReleases(newcomer.id, TODAY);
    check(fresh.length === 0, "una cuenta sin relaciones tiene la vista personal vacía");

    console.log("Reemplazo de la ventana");
    feedMode = "without-popular";
    const second = await sync.syncReleaseCalendar({ today: TODAY });
    check(second.status === "succeeded", "la segunda sincronización termina bien");
    const [gone] = await db.select().from(releaseCalendarEntry).where(eq(releaseCalendarEntry.releaseGroupMbid, rgMbid(1)));
    check(!gone, "el disco que el feed ya no devuelve sale del calendario");
    check(!(await read.listAnonymousReleases(TODAY)).some((r) => r.title === "Reciente"), "y del riel");
    const [kept] = await db.select().from(releaseCalendarEntry).where(eq(releaseCalendarEntry.releaseGroupMbid, rgMbid(2)));
    check(kept?.exclusion === "secondary_type" && kept.verifiedAt !== null, "la verificación previa se conserva");

    console.log("Fallo externo");
    const before = await db.select({ id: releaseCalendarEntry.id }).from(releaseCalendarEntry);
    feedMode = "fail";
    const failed = await sync.syncReleaseCalendar({ today: TODAY });
    check(failed.status === "failed", "un error de ListenBrainz termina en failed");
    const after = await db.select({ id: releaseCalendarEntry.id }).from(releaseCalendarEntry);
    check(after.length === before.length, "el calendario anterior se conserva");
    const [lastSync] = await db
      .select()
      .from(releaseCalendarSync)
      .orderBy(sql`${releaseCalendarSync.startedAt} DESC`)
      .limit(1);
    check(lastSync?.status === "failed" && lastSync.error, "el fallo queda registrado con su error");
    check(!(await sync.isReleaseCalendarStale()), "un fallo no vence una sincronización exitosa reciente");

    console.log("\nSmoke test de calendario de lanzamientos OK");
  } finally {
    // Restaura el calendario anterior y borra los fixtures.
    await db.transaction(async (tx) => {
      await tx.delete(releaseCalendarEntry);
      for (let i = 0; i < backupEntries.length; i += 500) {
        await tx.insert(releaseCalendarEntry).values(backupEntries.slice(i, i + 500));
      }
      const created = (await tx.select({ id: releaseCalendarSync.id }).from(releaseCalendarSync))
        .map((r) => r.id)
        .filter((id) => !backupSyncIds.includes(id));
      if (created.length) await tx.delete(releaseCalendarSync).where(inArray(releaseCalendarSync.id, created));
    });
    await db.delete(appUser).where(like(appUser.username, "smoke_cal_%"));
    await db.delete(releaseGroup).where(like(sql`${releaseGroup.mbid}::text`, "5e0ce000-0000-4000-8000-0000000081%"));
    await db.delete(artist).where(like(sql`${artist.mbid}::text`, "5e0ce000-0000-4000-8000-0000000080%"));
    console.log(`Limpieza: calendario restaurado (${backupEntries.length} entradas) y fixtures borrados.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
