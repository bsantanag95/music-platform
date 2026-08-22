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
import { appUser, artist, listenEntry, rating } from "../src/db/schema";
import {
  createListenEntry,
  deleteListenEntry,
  listMyDiary,
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
};

async function main() {
  try {
    await db.insert(appUser).values(user);
    await db.insert(artist).values(syntheticArtist);

    const target = await resolveDiaryTarget("artist", syntheticArtist.id);
    if (target.type !== "artist") throw new Error("objetivo no resuelto");

    // Primera escucha → first_listen + audiencia followers por defecto.
    const first = await createListenEntry(target, user.id);
    if (first.listenContext !== "first_listen") throw new Error("primera escucha no es first_listen");
    if (first.audience !== "followers") throw new Error("audiencia por defecto no es followers");

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

    console.log("✅ smoke-test-diary: todos los casos pasaron");
  } finally {
    await db.delete(listenEntry).where(eq(listenEntry.userId, user.id));
    await db.delete(artist).where(
      and(eq(artist.id, syntheticArtist.id), eq(artist.name, syntheticArtist.name)),
    );
    await db.delete(appUser).where(and(eq(appUser.id, user.id), eq(appUser.username, user.username)));
    console.log("🧹 smoke-test-diary: fixtures limpiados");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ smoke-test-diary falló:", error);
    process.exit(1);
  });