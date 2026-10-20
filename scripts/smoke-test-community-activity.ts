export {};

// Smoke test del cambio redesign-activity-page contra Postgres REAL (el SQL que las pruebas unitarias mockean): el riel
// "Con más conversación esta semana" (`listTrendingConversations`: umbral de personas distintas, comentarios raíz,
// contenido oculto, cuenta desactivada, perfil privado, bloqueo por lector, ventana de 7 días, tiempo de la lectura sin
// caché) y el filtro `kind` de "Recientes" (`listCommunityActivity`).
// Escribe usuarios `smoke_act_*` y álbumes sintéticos (MBID `5e0ce000-0000-4000-8000-0000000ac0xx`) y los borra al
// terminar (también si falla). Si se interrumpió, limpiar con
//   DELETE FROM app_user WHERE username LIKE 'smoke_act_%';
//   DELETE FROM release_group WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-0000000ac0%';
// (el `ON DELETE CASCADE` limpia valoraciones, comentarios, reseñas y bloqueos). Correr contra una BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-community-activity.ts

import { randomUUID } from "node:crypto";
import { like, sql } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import { appUser, comment, rating, releaseGroup, review, userBlock } from "../src/db/schema";
import {
  TRENDING_LIMIT,
  listTrendingConversations,
  resetTrendingConversationsCache,
} from "../src/services/activity/trending-conversations";
import { listCommunityActivity } from "../src/services/activity/community-activity";

assertSmokeAllowed();

const suffix = randomUUID().slice(0, 8);
const MBID_PREFIX = "5e0ce000-0000-4000-8000-0000000ac0";
const DAY_MS = 24 * 60 * 60 * 1000;
// Presupuesto de la lectura sin caché (tarea 5.2).
const BUDGET_MS = 50;

function check(condition: unknown, message: string): void {
  if (!condition) throw new Error(`FALLÓ: ${message}`);
  console.log(`  ✓ ${message}`);
}

const newUser = (label: string) => ({
  id: randomUUID(),
  username: `smoke_act_${label}_${suffix}`,
  email: `smoke_act_${label}_${suffix}@example.test`,
});

// Lectura sin caché: cada comprobación del riel ve el estado actual de la BD.
async function trending(viewerId: string | null, now = Date.now()) {
  resetTrendingConversationsCache();
  return listTrendingConversations(viewerId, now);
}

async function main() {
  const people = [1, 2, 3, 4, 5].map((n) => newUser(`p${n}`));
  const loner = newUser("loner");
  const hidden = newUser("hidden");
  const deactivated = newUser("off");
  const privateUser = newUser("private");
  const replier = newUser("replier");
  const viewer = newUser("viewer");

  // Restos de una corrida interrumpida (solo fixtures propios: prefijo y nombres sintéticos).
  await cleanup();

  try {
    await db.insert(appUser).values([
      ...people,
      loner,
      hidden,
      { ...deactivated, deactivatedAt: new Date() },
      { ...privateUser, profileVisibility: "private" },
      replier,
      viewer,
    ]);
    const albums = await db
      .insert(releaseGroup)
      .values(
        ["01", "02", "03", "04", "05", "06"].map((n) => ({
          mbid: `${MBID_PREFIX}${n}`,
          title: `Smoke Conversación ${n} ${suffix}`,
          category: "studio",
        })),
      )
      .returning();
    const [popular, solo, withHidden, withDeactivated, withPrivate, withReply] = albums;
    if (!popular || !solo || !withHidden || !withDeactivated || !withPrivate || !withReply) {
      throw new Error("no se crearon los álbumes sintéticos");
    }

    // Álbum popular: cinco personas, mezclando valoraciones, comentarios y reseñas (y una persona con las tres).
    await db.insert(rating).values(people.slice(0, 3).map((p) => ({ userId: p.id, releaseGroupId: popular.id, stars: "4.0" })));
    await db.insert(comment).values([
      { userId: people[3]!.id, releaseGroupId: popular.id, body: "smoke comentario" },
      { userId: people[0]!.id, releaseGroupId: popular.id, body: "smoke comentario repetido" },
    ]);
    await db.insert(review).values([
      { userId: people[4]!.id, releaseGroupId: popular.id, title: "Smoke", body: "smoke reseña" },
      { userId: people[0]!.id, releaseGroupId: popular.id, title: "Smoke", body: "smoke reseña propia" },
    ]);
    // Una sola persona que comenta tres veces.
    await db.insert(comment).values(
      [1, 2, 3].map((n) => ({ userId: loner.id, releaseGroupId: solo.id, body: `smoke solo ${n}` })),
    );
    // Dos personas, pero una con la reseña oculta por moderación.
    await db.insert(rating).values({ userId: people[0]!.id, releaseGroupId: withHidden.id, stars: "3.0" });
    await db.insert(review).values({
      userId: hidden.id,
      releaseGroupId: withHidden.id,
      title: "Oculta",
      body: "smoke oculta",
      moderationStatus: "hidden",
    });
    // Dos personas, una con la cuenta desactivada; dos personas, una con perfil privado.
    await db.insert(rating).values([
      { userId: people[0]!.id, releaseGroupId: withDeactivated.id, stars: "3.0" },
      { userId: deactivated.id, releaseGroupId: withDeactivated.id, stars: "3.0" },
      { userId: people[0]!.id, releaseGroupId: withPrivate.id, stars: "3.0" },
      { userId: privateUser.id, releaseGroupId: withPrivate.id, stars: "3.0" },
    ]);
    // Un comentario raíz y una respuesta de otra persona: las respuestas no suman.
    const [root] = await db
      .insert(comment)
      .values({ userId: people[1]!.id, releaseGroupId: withReply.id, body: "smoke raíz" })
      .returning();
    await db.insert(comment).values({
      userId: replier.id,
      releaseGroupId: withReply.id,
      parentId: root!.id,
      body: "smoke respuesta",
    });

    console.log("Riel: umbral y visibilidad");
    // La conexión ya está abierta (los inserts de arriba): la medición es solo de la lectura. Se toma la mejor de tres
    // corridas sin caché para no medir el ruido de la máquina.
    const timings: number[] = [];
    let anonymous = await trending(null);
    for (let run = 0; run < 3; run++) {
      const started = performance.now();
      anonymous = await trending(null);
      timings.push(performance.now() - started);
    }
    const elapsed = Math.min(...timings);
    const ours = (id: string) => anonymous.find((album) => album.releaseGroupId === id);
    check(ours(popular.id)?.people === 5, "el álbum con cinco personas distintas aparece con 5 (sin contar dos veces a quien hizo tres cosas)");
    check(anonymous.length <= TRENDING_LIMIT, `devuelve como máximo ${TRENDING_LIMIT} álbumes`);
    check(!ours(solo.id), "una sola persona que comenta tres veces no alcanza el umbral");
    check(!ours(withHidden.id), "una reseña oculta por moderación no cuenta");
    check(!ours(withDeactivated.id), "una cuenta desactivada no cuenta");
    check(!ours(withPrivate.id), "un perfil privado no cuenta");
    check(!ours(withReply.id), "una respuesta no cuenta como persona en la conversación");
    check(
      ours(popular.id)?.title.startsWith("Smoke Conversación 01"),
      "trae el título del álbum para mostrarlo en el riel",
    );
    console.log(
      `  · lectura sin caché: ${elapsed.toFixed(1)} ms (mejor de 3: ${timings.map((t) => t.toFixed(1)).join(" / ")}; presupuesto ${BUDGET_MS} ms)`,
    );
    check(elapsed < BUDGET_MS, `la lectura sin caché entra en el presupuesto de ${BUDGET_MS} ms`);

    console.log("Riel: bloqueo por lector");
    await db.insert(userBlock).values([
      { blockerId: viewer.id, blockedId: people[0]!.id },
      { blockerId: people[1]!.id, blockedId: viewer.id },
      { blockerId: viewer.id, blockedId: people[2]!.id },
    ]);
    const forViewer = (await trending(viewer.id)).find((album) => album.releaseGroupId === popular.id);
    check(forViewer?.people === 2, "con bloqueos en ambas direcciones, el lector ve el álbum con 2 personas");
    await db.insert(userBlock).values({ blockerId: viewer.id, blockedId: people[3]!.id });
    check(
      !(await trending(viewer.id)).some((album) => album.releaseGroupId === popular.id),
      "si quedan menos de 2 personas para el lector, el álbum no aparece",
    );
    check(
      (await trending(null)).some((album) => album.releaseGroupId === popular.id),
      "para quien no está bloqueado sigue apareciendo",
    );

    console.log("Riel: ventana de 7 días");
    const later = await trending(null, Date.now() + 8 * DAY_MS);
    check(!later.some((album) => album.releaseGroupId === popular.id), "ocho días después la actividad sale de la ventana");

    console.log("Recientes: filtro kind");
    const onlyReviews = await listCommunityActivity(null, 1, 20, { kind: "review" });
    check(onlyReviews.entries.length > 0, "con kind=review hay entradas");
    check(onlyReviews.entries.every((entry) => entry.kind === "review"), "con kind=review todas son reseñas");
    const onlyRatings = await listCommunityActivity(null, 1, 20, { kind: "rating" });
    check(onlyRatings.entries.every((entry) => entry.kind === "rating"), "con kind=rating todas son valoraciones");
    const all = await listCommunityActivity(null, 1, 30);
    check(new Set(all.entries.map((entry) => entry.kind)).size > 1, "sin kind mezcla los tipos");

    console.log("OK");
  } finally {
    await cleanup();
  }
}

async function cleanup() {
  await db.delete(appUser).where(like(appUser.username, "smoke_act_%"));
  await db.delete(releaseGroup).where(sql`${releaseGroup.mbid}::text LIKE ${`${MBID_PREFIX}%`}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
