export {};

// Smoke test del cambio add-listen-diary-reactions (diario de escucha).
// Escribe fixtures en la BD apuntada por DATABASE_URL y los limpia al final.
// Usa Postgres real y los servicios reales del diario (no sale a internet:
// los servicios del diario no consultan MusicBrainz).
// Correr idealmente contra una BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-diary.ts

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import { appUser, artist, listenEntry, rating, wantToListenEntry } from "../src/db/schema";
import {
  createListenEntry,
  deleteListenEntry,
  listMyDiary,
  listMyDiaryMonths,
  resolveDiaryTarget,
  updateListenEntry,
} from "../src/services/diary/diary";
import { sql } from "drizzle-orm";

assertSmokeAllowed();

const suffix = randomUUID().slice(0, 8);
const user = {
  id: randomUUID(),
  username: `smoke-diary-${suffix}`,
  email: `smoke-diary-${suffix}@example.test`,
};
// Artista sintético de prueba (mbid falso, tipo desconocido-validado): se
// borra al final para no contaminar el catálogo.
const syntheticArtist = {
  id: randomUUID(),
  mbid: randomUUID(),
  type: "person",
  name: `Smoke Diary Artist ${suffix}`,
  // Foto sintética (sin archivo espejado: el CHECK solo exige licencia y fuente
  // cuando hay `photo_file`) para verificar la imagen por tipo de objetivo.
  photoUrl: `https://example.test/smoke-diary-${suffix}.webp`,
};

async function main() {
  try {
    await db.insert(appUser).values(user);
    await db.insert(artist).values(syntheticArtist);

    const target = await resolveDiaryTarget("artist", syntheticArtist.id);
    if (target.type !== "artist") throw new Error("objetivo no resuelto");

    // Primera escucha → first_listen + audiencia private por defecto (un registro
    // rápido no expresa intención de compartir; openspec: deepen-listening-diary, D1).
    const first = await createListenEntry(target, user.id);
    if (first.listenContext !== "first_listen") throw new Error("primera escucha no es first_listen");
    if (first.audience !== "private") throw new Error("audiencia por defecto no es private");

    // Segunda escucha → relisten.
    const second = await createListenEntry(target, user.id);
    if (second.listenContext !== "relisten") throw new Error("segunda escucha no es relisten");

    // Ampliación con impresión, contexto, reacción y audiencia.
    const expanded = await updateListenEntry(first.id, user.id, {
      body: "El bajo está ridículamente bueno",
      listenContext: "rediscovery",
      reaction: "obsessed",
      audience: "private",
    });
    if (expanded.reaction !== "obsessed") throw new Error("reacción no persistida");
    if (expanded.audience !== "private") throw new Error("audiencia no actualizada");
    if (expanded.body !== "El bajo está ridículamente bueno") throw new Error("impresión no persistida");

    // Diario paginado, orden descendente.
    const diary = await listMyDiary(user.id, 1, 20);
    const newest = diary.entries[0];
    if (diary.entries.length !== 2) throw new Error("el diario no tiene 2 entradas");
    if (!newest || newest.id !== second.id) throw new Error("el diario no ordena descendente");

    // Borrado físico.
    await deleteListenEntry(second.id, user.id);
    const afterDelete = await listMyDiary(user.id, 1, 20);
    const remaining = afterDelete.entries[0];
    if (afterDelete.entries.length !== 1 || !remaining || remaining.id !== first.id) {
      throw new Error("el borrado no dejó la entrada esperada");
    }

    // Independencia con rating: ninguna operación creó una valoración.
    const [ratingCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(rating)
      .where(and(eq(rating.userId, user.id), eq(rating.artistId, syntheticArtist.id)));
    if ((ratingCount?.count ?? 0) !== 0) {
      throw new Error("las operaciones del diario tocaron la tabla de valoración");
    }

    await checkRedesignDiaryPage(target);

    console.log("✅ smoke-test-diary: todos los casos pasaron");
  } finally {
    await db.delete(wantToListenEntry).where(eq(wantToListenEntry.userId, user.id));
    await db.delete(listenEntry).where(eq(listenEntry.userId, user.id));
    await db.delete(artist).where(
      and(eq(artist.id, syntheticArtist.id), eq(artist.name, syntheticArtist.name)),
    );
    await db.delete(appUser).where(and(eq(appUser.id, user.id), eq(appUser.username, user.username)));
    console.log("🧹 smoke-test-diary: fixtures limpiados");
  }
}

// openspec: redesign-diary-page — zona horaria, imagen por tipo, Want to Listen
// y presupuesto de la página, contra Postgres real.
async function checkRedesignDiaryPage(target: Awaited<ReturnType<typeof resolveDiaryTarget>>) {
  await db.delete(listenEntry).where(eq(listenEntry.userId, user.id));

  // 22:00 del 30 de septiembre en America/Santiago (UTC−3 en horario de
  // verano) es la 01:00 del 1 de octubre en UTC.
  const lateNight = new Date("2026-10-01T01:00:00Z");
  const [boundary] = await db
    .insert(listenEntry)
    .values({ userId: user.id, artistId: syntheticArtist.id, listenContext: "first_listen", createdAt: lateNight })
    .returning({ id: listenEntry.id });
  if (!boundary) throw new Error("no se insertó la escucha de fin de mes");

  const ids = async (filters: Parameters<typeof listMyDiary>[3]) =>
    (await listMyDiary(user.id, 1, 20, filters)).entries.map((entry) => entry.id);
  const tz = "America/Santiago";
  if (!(await ids({ year: 2026, month: 9, timeZone: tz })).includes(boundary.id)) {
    throw new Error("con zona horaria, la escucha de las 22:00 del 30/9 no cae en septiembre");
  }
  if ((await ids({ year: 2026, month: 10, timeZone: tz })).includes(boundary.id)) {
    throw new Error("con zona horaria, la escucha de las 22:00 del 30/9 cae en octubre");
  }
  if (!(await ids({ year: 2026, month: 10 })).includes(boundary.id)) {
    throw new Error("sin zona horaria (UTC), la escucha no cae en octubre");
  }
  if (!(await ids({ year: 2026, timeZone: tz })).includes(boundary.id)) {
    throw new Error("el filtro de año con zona horaria perdió la escucha");
  }
  const monthsLocal = await listMyDiaryMonths(user.id, tz);
  const monthsUtc = await listMyDiaryMonths(user.id);
  if (monthsLocal.length !== 1 || monthsLocal[0]!.month !== 9) {
    throw new Error(`meses con zona horaria: se esperaba solo septiembre, llegó ${JSON.stringify(monthsLocal)}`);
  }
  if (monthsUtc.length !== 1 || monthsUtc[0]!.month !== 10) {
    throw new Error(`meses en UTC: se esperaba solo octubre, llegó ${JSON.stringify(monthsUtc)}`);
  }

  // Imagen por tipo: la foto del artista; y una canción del catálogo con
  // carátula de álbum (si la BD tiene alguna) trae esa carátula.
  const [artistEntry] = (await listMyDiary(user.id, 1, 20)).entries;
  if (artistEntry?.target.coverThumbUrl !== syntheticArtist.photoUrl) {
    throw new Error("la escucha de un artista no trae su foto");
  }
  const songRows = await db.execute<{ recording_id: string; cover: string }>(sql`
    SELECT t.recording_id, rg.cover_thumb_url AS cover FROM track t
    JOIN release r ON r.id = t.release_id
    JOIN release_group rg ON rg.id = r.release_group_id
    WHERE rg.cover_thumb_url IS NOT NULL
    LIMIT 1`);
  const song = (songRows as unknown as { rows?: { recording_id: string }[] }).rows?.[0] ??
    (songRows as unknown as { recording_id: string }[])[0];
  if (song) {
    const songTarget = await resolveDiaryTarget("recording", song.recording_id);
    const songEntry = await createListenEntry(songTarget, user.id);
    if (!songEntry.target.coverThumbUrl) throw new Error("la escucha de una canción no trae la carátula de su álbum");
  } else {
    console.log("⚠️  sin canciones con carátula en la BD: se omite la carátula de canción");
  }

  // Want to Listen: el diario propio lo refleja por entrada (crear la escucha
  // retira el pendiente, así que se marca después).
  await db.insert(wantToListenEntry).values({ userId: user.id, artistId: syntheticArtist.id });
  const withWanted = (await listMyDiary(user.id, 1, 20)).entries;
  const artistRows = withWanted.filter((entry) => entry.target.type === "artist");
  if (!artistRows.length || !artistRows.every((entry) => entry.inWantToListen === true)) {
    throw new Error("inWantToListen no refleja el pendiente del artista");
  }
  if (withWanted.some((entry) => entry.target.type === "recording" && entry.inWantToListen)) {
    throw new Error("una canción figura en Want to Listen");
  }
  await db.delete(wantToListenEntry).where(eq(wantToListenEntry.userId, user.id));
  if ((await listMyDiary(user.id, 1, 20)).entries.some((entry) => entry.inWantToListen)) {
    throw new Error("inWantToListen sigue verdadero sin pendiente");
  }

  // Presupuesto: una página de 20 entradas (con las subconsultas de carátula,
  // artista acreditado y Want to Listen) en caliente bajo 50 ms.
  for (let i = 0; i < 20; i++) await createListenEntry(target, user.id);
  await listMyDiary(user.id, 1, 20, { timeZone: tz });
  const started = performance.now();
  await listMyDiary(user.id, 1, 20, { timeZone: tz });
  const elapsed = performance.now() - started;
  console.log(`⏱️  página de 20 entradas: ${elapsed.toFixed(1)} ms`);
  if (elapsed > 50) throw new Error(`la página de 20 entradas tardó ${elapsed.toFixed(1)} ms (> 50 ms)`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ smoke-test-diary falló:", error);
    process.exit(1);
  });