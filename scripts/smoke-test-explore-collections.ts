export {};

// Smoke test del cambio automate-explore-collections contra Postgres REAL (el SQL que las pruebas
// unitarias mockean): la migración 0069 (CHECKs, índice único parcial, `rank` ya no único), la
// generación de colecciones (creación, idempotencia, reemplazo completo, mínimo de álbumes,
// rotación por período, sin tocar `user_list.updated_at`), la vigencia y el tope del riel, el lock
// y la conservación ante fallo, la exclusión de la consola editorial y del feed, y que el SQL de
// las cuatro plantillas reales se ejecuta.
//
// No sale a internet. Usa plantillas sintéticas (`smoke-*`) con álbumes de MBID
// `5e0ce000-0000-4000-8000-0000000009c*`; las plantillas reales solo se EJECUTAN en lectura. Crea la
// cuenta curadora si no existe (y la borra solo si la creó). Borra sus fixtures al terminar, también
// si falla. Si se interrumpió, limpiar con
//   DELETE FROM user_list WHERE id IN (SELECT list_id FROM user_list_featured WHERE template_key LIKE 'smoke-%');
//   DELETE FROM explore_collection_sync WHERE template_key LIKE 'smoke-%';
//   DELETE FROM release_group WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-0000000009c%';
// Necesita la migración 0069 aplicada. Correr contra una BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-explore-collections.ts

import { and, eq, inArray, like, sql } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import { appUser, exploreCollectionSync, releaseGroup, userList, userListFeatured, userListItem } from "../src/db/schema";
import { CURATOR_DISPLAY_NAME, CURATOR_USERNAME, FEATURED_RAIL_LIMIT } from "../src/services/discovery/constants";
import { notGeneratedCollectionCondition } from "../src/services/discovery/collections/conditions";
import { generateCollection } from "../src/services/discovery/collections/generate";
import { syncTemplate } from "../src/services/discovery/collections/sync";
import { COLLECTION_TEMPLATES, EVERGREEN, type CollectionTemplate } from "../src/services/discovery/collections/templates";
import { listFeaturedCollections } from "../src/services/discovery/discovery";
import { listEditorialLists } from "../src/services/lists/editorial";

assertSmokeAllowed();

const mbid = (n: number) => `5e0ce000-0000-4000-8000-0000000009c${n.toString(16)}`;
const ALBUM_COUNT = 10;

function check(condition: unknown, message: string): void {
  if (!condition) throw new Error(`FALLÓ: ${message}`);
  console.log(`  ✓ ${message}`);
}

async function expectRejects(run: () => Promise<unknown>, pattern: RegExp, message: string): Promise<void> {
  try {
    await run();
  } catch (error) {
    const text = error instanceof Error ? `${error.message} ${(error as { cause?: { message?: string } }).cause?.message ?? ""}` : String(error);
    check(pattern.test(text), message);
    return;
  }
  throw new Error(`FALLÓ: ${message} (no lanzó)`);
}

let albumIds: string[] = [];
let createdCurator = false;

function template(key: string, ids: () => string[], period: (now: Date) => string = () => EVERGREEN): CollectionTemplate {
  return {
    key,
    rank: 9,
    periodKey: period,
    title: (now) => `Smoke ${key} ${period(now)}`,
    select: async () => ids(),
  };
}

async function cleanup(): Promise<void> {
  await db.execute(
    sql`DELETE FROM user_list WHERE id IN (SELECT list_id FROM user_list_featured WHERE template_key LIKE 'smoke-%' OR (source = 'curated' AND rank = 99))`,
  );
  await db.delete(exploreCollectionSync).where(like(exploreCollectionSync.templateKey, "smoke-%"));
  await db.delete(releaseGroup).where(like(sql`${releaseGroup.mbid}::text`, "5e0ce000-0000-4000-8000-0000000009c%"));
  if (createdCurator) await db.delete(appUser).where(eq(appUser.username, CURATOR_USERNAME));
}

async function main() {
  await cleanup();

  // Cuenta curadora (la crea si falta) y álbumes sintéticos.
  const [existing] = await db.select({ id: appUser.id }).from(appUser).where(eq(appUser.username, CURATOR_USERNAME));
  let curatorId = existing?.id;
  if (!curatorId) {
    const [created] = await db
      .insert(appUser)
      .values({
        username: CURATOR_USERNAME,
        email: "exploracion@curator.local",
        displayName: CURATOR_DISPLAY_NAME,
        passwordHash: null,
        profileVisibility: "public",
      })
      .returning({ id: appUser.id });
    curatorId = created!.id;
    createdCurator = true;
  }
  albumIds = (
    await db
      .insert(releaseGroup)
      .values(
        Array.from({ length: ALBUM_COUNT }, (_, i) => ({
          mbid: mbid(i),
          title: `Smoke colección ${i}`,
          category: "studio" as const,
          firstReleaseYear: 2000 + i,
          coverThumbUrl: "https://example.test/cover.jpg",
        })),
      )
      .returning({ id: releaseGroup.id })
  ).map((row) => row.id);

  console.log("Migración 0069:");
  {
    const [list] = await db
      .insert(userList)
      .values({ ownerId: curatorId, entityType: "release-group", title: "Smoke CHECK", audience: "public" })
      .returning({ id: userList.id });
    await expectRejects(
      () => db.insert(userListFeatured).values({ listId: list!.id, rank: 99, source: "template" }),
      /chk_user_list_featured_template/,
      "una fila `template` sin plantilla/período se rechaza",
    );
    await expectRejects(
      () => db.insert(userListFeatured).values({ listId: list!.id, rank: 99, source: "otro" as never }),
      /chk_user_list_featured_source/,
      "un origen inválido se rechaza",
    );
    await expectRejects(
      () =>
        db.insert(userListFeatured).values({
          listId: list!.id,
          rank: 99,
          startsAt: new Date("2026-02-01T00:00:00Z"),
          expiresAt: new Date("2026-01-01T00:00:00Z"),
        }),
      /chk_user_list_featured_window/,
      "`expires_at` anterior a `starts_at` se rechaza",
    );
    // `rank` ya no es único: dos curadas con el mismo rank conviven.
    const [other] = await db
      .insert(userList)
      .values({ ownerId: curatorId, entityType: "release-group", title: "Smoke CHECK 2", audience: "public" })
      .returning({ id: userList.id });
    await db.insert(userListFeatured).values([
      { listId: list!.id, rank: 99 },
      { listId: other!.id, rank: 99 },
    ]);
    check(true, "`rank` ya no es único");
    await db.delete(userList).where(inArray(userList.id, [list!.id, other!.id]));
  }

  console.log("Generación:");
  const evergreen = template("smoke-evergreen", () => albumIds.slice(0, 8));
  const first = await generateCollection(evergreen);
  check(first.status === "generated" && first.created && first.items === 8, "primera corrida crea la lista con 8 álbumes");
  const listId = first.status === "generated" ? first.listId : "";
  const [listBefore] = await db.select().from(userList).where(eq(userList.id, listId));
  check(listBefore!.audience === "public" && listBefore!.ownerId === curatorId, "lista pública de la cuenta curadora");
  const [featured] = await db.select().from(userListFeatured).where(eq(userListFeatured.listId, listId));
  check(
    featured!.source === "template" && featured!.templateKey === "smoke-evergreen" && featured!.periodKey === EVERGREEN,
    "fila destacada `template` con clave y período",
  );

  const second = await generateCollection(evergreen);
  check(second.status === "generated" && !second.created && second.listId === listId, "segunda corrida reutiliza la lista (idempotente)");
  const [listCount] = await db.execute<{ n: number }>(
    sql`SELECT count(*)::int AS n FROM user_list_featured WHERE template_key = 'smoke-evergreen'`,
  );
  check(listCount!.n === 1, "no se duplican filas destacadas");

  // Reemplazo completo: ahora el selector devuelve otros 7, solapando 3.
  const replaced = template("smoke-evergreen", () => albumIds.slice(5, 10).concat(albumIds.slice(0, 2)));
  await generateCollection(replaced);
  const items = await db
    .select({ id: userListItem.releaseGroupId, position: userListItem.position })
    .from(userListItem)
    .where(eq(userListItem.listId, listId))
    .orderBy(userListItem.position);
  const expected = albumIds.slice(5, 10).concat(albumIds.slice(0, 2));
  check(
    items.length === 7 && items.every((row, index) => row.id === expected[index] && row.position === index + 1),
    "los ítems se reemplazan por completo, en el orden del selector",
  );
  const [listAfter] = await db.select().from(userList).where(eq(userList.id, listId));
  check(listAfter!.updatedAt.getTime() === listBefore!.updatedAt.getTime(), "no se toca `user_list.updated_at` (sin eventos de feed)");

  // Mínimo de álbumes: con 3 no crea ni toca.
  const few = await generateCollection(template("smoke-few", () => albumIds.slice(0, 3)));
  check(few.status === "skipped", "con menos del mínimo no se genera");
  const [fewRows] = await db.execute<{ n: number }>(
    sql`SELECT count(*)::int AS n FROM user_list_featured WHERE template_key = 'smoke-few'`,
  );
  check(fewRows!.n === 0, "tampoco crea fila destacada");
  const keep = await generateCollection(template("smoke-evergreen", () => albumIds.slice(0, 2)));
  const itemsKept = await db.select({ id: userListItem.id }).from(userListItem).where(eq(userListItem.listId, listId));
  check(keep.status === "skipped" && itemsKept.length === 7, "con menos del mínimo una lista existente se conserva");

  console.log("Períodos y rotación:");
  const byMonth = (ids: () => string[]) => template("smoke-period", ids, (now) => `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`);
  const october = await generateCollection(byMonth(() => albumIds.slice(0, 6)), new Date("2026-10-15T00:00:00Z"));
  const november = await generateCollection(byMonth(() => albumIds.slice(1, 8)), new Date("2026-11-03T00:00:00Z"));
  check(
    october.status === "generated" && november.status === "generated" && october.listId !== november.listId,
    "cada período tiene su propia lista",
  );
  const octoberRow = (
    await db.select().from(userListFeatured).where(eq(userListFeatured.listId, october.status === "generated" ? october.listId : ""))
  )[0]!;
  const novemberRow = (
    await db.select().from(userListFeatured).where(eq(userListFeatured.listId, november.status === "generated" ? november.listId : ""))
  )[0]!;
  check(octoberRow.expiresAt !== null, "el período anterior queda con `expires_at`");
  check(novemberRow.expiresAt === null, "el período nuevo queda vigente");
  const [oldList] = await db.select({ audience: userList.audience }).from(userList).where(eq(userList.id, octoberRow.listId));
  check(oldList?.audience === "public", "la lista vencida sigue pública");

  console.log("Riel:");
  const rail = await listFeaturedCollections();
  const railIds = rail.map((row) => row.id);
  check(railIds.includes(listId), "la colección vigente aparece en el riel");
  check(railIds.includes(novemberRow.listId) && !railIds.includes(octoberRow.listId), "la vencida no aparece");
  check(rail.length <= FEATURED_RAIL_LIMIT, `el riel respeta el tope de ${FEATURED_RAIL_LIMIT}`);
  await db
    .update(userListFeatured)
    .set({ startsAt: sql`now() + interval '1 day'`, expiresAt: sql`now() + interval '2 days'` })
    .where(eq(userListFeatured.listId, listId));
  check(!(await listFeaturedCollections()).some((row) => row.id === listId), "una colección programada a futuro no aparece");
  await db.update(userListFeatured).set({ startsAt: sql`now() - interval '1 day'`, expiresAt: null }).where(eq(userListFeatured.listId, listId));

  console.log("Consola editorial y feed:");
  const editorial = await listEditorialLists();
  check(!editorial.some((row) => row.id === listId), "la consola editorial no lista las generadas");
  const visibleToFeed = await db
    .select({ id: userList.id })
    .from(userList)
    .where(and(eq(userList.id, listId), notGeneratedCollectionCondition()));
  check(visibleToFeed.length === 0, "el feed excluye las generadas");
  const [manual] = await db
    .insert(userList)
    .values({ ownerId: curatorId, entityType: "release-group", title: "Smoke manual", audience: "public" })
    .returning({ id: userList.id });
  const manualVisible = await db
    .select({ id: userList.id })
    .from(userList)
    .where(and(eq(userList.id, manual!.id), notGeneratedCollectionCondition()));
  check(manualVisible.length === 1, "una lista no generada sigue visible para el feed");
  await db.delete(userList).where(eq(userList.id, manual!.id));

  console.log("Lock y fallo:");
  const lockTemplate = template("smoke-lock", () => albumIds.slice(0, 8));
  const [run] = await db.insert(exploreCollectionSync).values({ templateKey: "smoke-lock" }).returning({ id: exploreCollectionSync.id });
  check((await syncTemplate(lockTemplate)).status === "skipped", "una corrida `running` reciente bloquea a otra");
  await db
    .update(exploreCollectionSync)
    .set({ startedAt: sql`now() - interval '20 minutes'` })
    .where(eq(exploreCollectionSync.id, run!.id));
  const resumed = await syncTemplate(lockTemplate);
  check(resumed.status === "succeeded", "una corrida `running` de más de 15 minutos se da por muerta");

  const failing: CollectionTemplate = {
    ...template("smoke-evergreen", () => []),
    select: async () => {
      throw new Error("falla simulada");
    },
  };
  const failed = await syncTemplate(failing);
  check(failed.status === "failed", "una plantilla que lanza se registra como fallida");
  const [failedRun] = await db
    .select({ status: exploreCollectionSync.status, error: exploreCollectionSync.error })
    .from(exploreCollectionSync)
    .where(and(eq(exploreCollectionSync.templateKey, "smoke-evergreen"), eq(exploreCollectionSync.status, "failed")));
  check(failedRun?.error === "falla simulada", "el error queda registrado");
  const itemsAfterFailure = await db.select({ id: userListItem.id }).from(userListItem).where(eq(userListItem.listId, listId));
  check(itemsAfterFailure.length === 7, "el fallo conserva la colección anterior");

  console.log("Plantillas reales (solo lectura):");
  for (const real of COLLECTION_TEMPLATES) {
    const ids = await real.select(new Date());
    check(Array.isArray(ids), `${real.key}: el SQL se ejecuta (${ids.length} álbumes)`);
  }

  console.log("Smoke test OK");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup().catch((error) => console.error("Error limpiando fixtures:", error));
    process.exit();
  });
