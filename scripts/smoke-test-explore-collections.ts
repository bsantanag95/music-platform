export {};

// Smoke test del cambio automate-explore-collections contra Postgres REAL (el SQL que las pruebas
// unitarias mockean): la migración 0069 (CHECKs, índice único parcial, `rank` ya no único), la
// generación de colecciones (creación, idempotencia, reemplazo completo, mínimo de álbumes,
// rotación por período, sin tocar `user_list.updated_at`), la vigencia y el tope del riel, el lock
// y la conservación ante fallo, la exclusión de la consola editorial y del feed, y que el SQL de
// las cuatro plantillas reales se ejecuta.
//
// Desde manage-explore-featured-console (migración 0070) también cubre la consola editorial: destacar
// (elegibilidad, permisos, auditoría), retiro de una oficial, vigencia, reordenamiento atómico y su
// conflicto, quitar, la herencia de peso al rotar un período, y pausar/reanudar plantillas. Crea usuarios
// `smoke_feat_*` (admin y curador) y listas oficiales `Smoke oficial*` bajo la cuenta curadora. PAUSA Y
// REANUDA la plantilla real `one-per-decade` (si se interrumpe en medio, reanudarla desde /admin o con
// `DELETE FROM explore_collection_template_state WHERE template_key = 'one-per-decade'` y regenerar).
//
// No sale a internet. Usa plantillas sintéticas (`smoke-*`) con álbumes de MBID
// `5e0ce000-0000-4000-8000-0000000009c*`; las plantillas reales solo se EJECUTAN en lectura. Crea la
// cuenta curadora si no existe (y la borra solo si la creó). Borra sus fixtures al terminar, también
// si falla. Si se interrumpió, limpiar con
//   DELETE FROM user_list WHERE id IN (SELECT list_id FROM user_list_featured WHERE template_key LIKE 'smoke-%');
//   DELETE FROM explore_collection_sync WHERE template_key LIKE 'smoke-%';
//   DELETE FROM user_list WHERE title LIKE 'Smoke oficial%';
//   DELETE FROM app_user WHERE username LIKE 'smoke_feat_%';
//   DELETE FROM release_group WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-0000000009c%';
// Necesita las migraciones 0069 y 0070 aplicadas. Correr contra una BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-explore-collections.ts

import { and, eq, inArray, like, sql } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import {
  appUser,
  editorialAction,
  exploreCollectionSync,
  exploreCollectionTemplateState,
  releaseGroup,
  userList,
  userListFeatured,
  userListItem,
  userRole,
} from "../src/db/schema";
import { CURATOR_DISPLAY_NAME, CURATOR_USERNAME, FEATURED_RAIL_LIMIT } from "../src/services/discovery/constants";
import { notGeneratedCollectionCondition } from "../src/services/discovery/collections/conditions";
import { generateCollection } from "../src/services/discovery/collections/generate";
import { staleTemplates, syncCollections, syncTemplate } from "../src/services/discovery/collections/sync";
import {
  featureList,
  listEligibleForFeature,
  listFeaturedAdmin,
  listTemplatesAdmin,
  pauseTemplate,
  reorderFeatured,
  resumeTemplate,
  unfeatureList,
  updateFeaturedSchedule,
} from "../src/services/discovery/featured";
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
  await db.delete(userList).where(like(userList.title, "Smoke oficial%")); // cascada: filas destacadas y auditoría
  // La auditoría de pausar/reanudar cuelga de una lista real: se borra por actor (FK RESTRICT).
  await db.execute(
    sql`DELETE FROM editorial_action WHERE actor_id IN (SELECT id FROM app_user WHERE username LIKE 'smoke_feat_%')`,
  );
  await db.delete(appUser).where(like(appUser.username, "smoke_feat_%"));
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

  console.log("Consola editorial:");
  {
    const suffix = Date.now().toString(36);
    const makeUser = async (label: string, role: "admin" | "editorial_curator") => {
      const [user] = await db
        .insert(appUser)
        .values({
          username: `smoke_feat_${label}_${suffix}`,
          email: `smoke_feat_${label}_${suffix}@example.test`,
          displayName: `Smoke ${label}`,
          passwordHash: null,
          profileVisibility: "public",
        })
        .returning({ id: appUser.id });
      await db.insert(userRole).values({ userId: user!.id, role });
      return user!.id;
    };
    const adminId = await makeUser("admin", "admin");
    const authorId = await makeUser("author", "editorial_curator");

    const official = async (title: string, over: Partial<typeof userList.$inferInsert> = {}) => {
      const [list] = await db
        .insert(userList)
        .values({
          ownerId: curatorId!,
          entityType: "release-group",
          title,
          audience: "public",
          isOfficial: true,
          officialPublishedAt: new Date(),
          editorialAuthorId: authorId,
          ...over,
        })
        .returning({ id: userList.id });
      return list!.id;
    };
    const actions = async (listId: string) =>
      (await db.select({ action: editorialAction.action }).from(editorialAction).where(eq(editorialAction.listId, listId)))
        .map((row) => row.action)
        .sort();
    const rowOf = async (listId: string) => (await listFeaturedAdmin()).find((row) => row.listId === listId);
    const rejectsCode = async (run: () => Promise<unknown>, code: string, message: string) => {
      try {
        await run();
      } catch (error) {
        check((error as { code?: string }).code === code, message);
        return;
      }
      throw new Error(`FALLÓ: ${message} (no lanzó)`);
    };

    const listA = await official("Smoke oficial A");
    const listB = await official("Smoke oficial B");
    const draft = await official("Smoke oficial borrador", { isOfficial: false, officialPublishedAt: null });
    const [foreign] = await db
      .insert(userList)
      .values({ ownerId: adminId, entityType: "release-group", title: "Smoke oficial ajena", audience: "public" })
      .returning({ id: userList.id });

    await rejectsCode(() => featureList(authorId, listA), "ROLE_REQUIRED", "destacar exige editorial.publish (un curador no puede)");
    await rejectsCode(() => featureList(adminId, draft), "FEATURE_NOT_PUBLISHED", "una lista en borrador no se destaca");
    await rejectsCode(() => featureList(adminId, foreign!.id), "FEATURE_NOT_ELIGIBLE", "una lista que no es de la cuenta curadora no se destaca");
    await rejectsCode(() => featureList(adminId, "00000000-0000-4000-8000-0000000000ff"), "LIST_NOT_FOUND", "una lista inexistente da LIST_NOT_FOUND");
    const eligibleBefore = await listEligibleForFeature();
    check(eligibleBefore.some((l) => l.id === listA) && !eligibleBefore.some((l) => l.id === draft), "el selector ofrece solo oficiales publicadas");

    await featureList(adminId, listA);
    await featureList(adminId, listB);
    check((await rowOf(listA))?.status === "in_rail" && (await rowOf(listA))?.source === "curated", "una oficial destacada entra al riel como `curated`");
    check(!(await listEligibleForFeature()).some((l) => l.id === listA), "una ya destacada deja de ofrecerse");
    check((await actions(listA)).join() === "feature", "destacar registra `feature` en editorial_action");
    await featureList(adminId, listA); // idempotente: no duplica
    const [featuredA] = await db.execute<{ n: number }>(
      sql`SELECT count(*)::int AS n FROM user_list_featured WHERE list_id = ${listA}`,
    );
    check(featuredA!.n === 1, "destacar dos veces no duplica la fila");

    // Retiro de la oficial: sale del riel, la fila se conserva; republicar la devuelve.
    await db.update(userList).set({ isOfficial: false, officialWithdrawnAt: new Date() }).where(eq(userList.id, listA));
    check((await rowOf(listA))?.status === "withdrawn", "retirar la oficial la saca del riel (`withdrawn`)");
    check(!(await listFeaturedCollections()).some((c) => c.id === listA), "y no aparece en el riel público");
    await db.update(userList).set({ isOfficial: true, officialWithdrawnAt: null }).where(eq(userList.id, listA));
    check((await rowOf(listA))?.status === "in_rail", "republicarla la devuelve sin recrear la fila");

    // Vigencia.
    const future = new Date(Date.now() + 3 * 24 * 3600 * 1000);
    await updateFeaturedSchedule(adminId, listB, { startsAt: future });
    check((await rowOf(listB))?.status === "scheduled", "una vigencia futura queda programada");
    await rejectsCode(
      () => updateFeaturedSchedule(adminId, listB, { expiresAt: new Date(Date.now() - 1000) }),
      "VALIDATION_ERROR",
      "una vigencia que termina antes de empezar se rechaza",
    );
    await updateFeaturedSchedule(adminId, listB, { startsAt: new Date(Date.now() - 1000), expiresAt: null });
    // Con otras colecciones sintéticas vigentes, el tope de 6 puede dejarla `beyond_limit`: lo que importa es que ya no está programada.
    check(["in_rail", "beyond_limit"].includes((await rowOf(listB))?.status ?? ""), "al llegar la fecha deja de estar programada");
    await rejectsCode(
      () => updateFeaturedSchedule(adminId, "00000000-0000-4000-8000-0000000000ff", { weight: 1 }),
      "FEATURED_NOT_FOUND",
      "reprogramar una no destacada da FEATURED_NOT_FOUND",
    );

    // Orden atómico.
    const orderable = (await listFeaturedAdmin()).filter((row) => row.orderable).map((row) => row.listId);
    const wanted = [listB, listA, ...orderable.filter((id) => id !== listA && id !== listB)];
    await reorderFeatured(adminId, wanted);
    const afterOrder = (await listFeaturedAdmin()).filter((row) => row.orderable).map((row) => row.listId);
    check(afterOrder[0] === listB && afterOrder[1] === listA, "el nuevo orden se refleja (la primera arriba)");
    check(
      (await listFeaturedCollections()).slice(0, 2).map((c) => c.id).join() === [listB, listA].join(),
      "y el riel público respeta el nuevo orden",
    );
    check((await actions(listB)).includes("feature"), "reordenar registra `feature` en las listas afectadas");
    await rejectsCode(() => reorderFeatured(adminId, wanted.slice(1)), "FEATURED_ORDER_CONFLICT", "un conjunto distinto del vigente da FEATURED_ORDER_CONFLICT");
    await rejectsCode(() => reorderFeatured(adminId, [...wanted, wanted[0]!]), "FEATURED_ORDER_CONFLICT", "ids repetidos dan FEATURED_ORDER_CONFLICT");
    check((await listFeaturedAdmin()).filter((row) => row.orderable)[0]?.listId === listB, "un conflicto no cambia nada");

    // Rotación: el período nuevo hereda peso y rank del anterior.
    const novemberId = november.status === "generated" ? november.listId : "";
    const weightBefore = (await rowOf(novemberId))!.weight;
    const december = await generateCollection(byMonth(() => albumIds.slice(2, 9)), new Date("2026-12-02T00:00:00Z"));
    const decemberId = december.status === "generated" ? december.listId : "";
    check((await rowOf(decemberId))?.weight === weightBefore, "el período nuevo hereda el peso del anterior");

    // Quitar.
    await unfeatureList(adminId, listA);
    check((await rowOf(listA)) === undefined, "quitar una curada borra su fila");
    check((await actions(listA)).includes("unfeature"), "y registra `unfeature`");
    await unfeatureList(adminId, decemberId);
    check((await rowOf(decemberId))?.status === "expired", "quitar una generada la vence (no se borra)");
    await rejectsCode(() => unfeatureList(adminId, listA), "FEATURED_NOT_FOUND", "quitar una no destacada da FEATURED_NOT_FOUND");

    // Plantillas.
    check((await listTemplatesAdmin()).length === COLLECTION_TEMPLATES.length, "el panel lista todas las plantillas");
    const KEY = "one-per-decade";
    const [priorState] = await db
      .select()
      .from(exploreCollectionTemplateState)
      .where(eq(exploreCollectionTemplateState.templateKey, KEY));
    await rejectsCode(() => pauseTemplate(adminId, "no-existe"), "TEMPLATE_NOT_FOUND", "pausar una plantilla desconocida da TEMPLATE_NOT_FOUND");
    await rejectsCode(() => pauseTemplate(authorId, KEY), "ROLE_REQUIRED", "pausar exige editorial.publish");
    try {
      await syncCollections({ keys: [KEY], force: true }); // asegura una colección vigente
      const before = (await listTemplatesAdmin()).find((t) => t.key === KEY)!;
      check(before.current !== null && !before.paused, "la plantilla tiene una colección vigente");
      check(before.lastItemCount !== null && before.lastItemCount >= 6, "el panel conoce cuántos álbumes cumplió la última corrida");
      await pauseTemplate(adminId, KEY);
      const paused = (await listTemplatesAdmin()).find((t) => t.key === KEY)!;
      check(paused.paused && paused.current === null, "pausar la marca y retira su colección vigente");
      check(!(await staleTemplates()).some((t) => t.key === KEY), "una pausada no se programa por visita");
      check((await syncCollections({ keys: [KEY], force: true })).length === 0, "ni el script la regenera sin `includePaused`");
      const forced = await syncCollections({ keys: [KEY], force: true, includePaused: true });
      check(forced[0]?.status === "succeeded", "con `includePaused` sí");
      check((await listTemplatesAdmin()).find((t) => t.key === KEY)!.current === null, "regenerar una pausada no la devuelve al riel");
      await resumeTemplate(adminId, KEY);
      const resumed = (await listTemplatesAdmin()).find((t) => t.key === KEY)!;
      check(
        !resumed.paused && resumed.current !== null && resumed.current.listId === before.current!.listId,
        "reanudar devuelve su colección al riel",
      );
      const trail = await actions(before.current!.listId);
      check(trail.includes("feature") && trail.includes("unfeature"), "pausar y reanudar quedan auditados");
    } finally {
      await resumeTemplate(adminId, KEY).catch(() => undefined);
      if (!priorState) await db.delete(exploreCollectionTemplateState).where(eq(exploreCollectionTemplateState.templateKey, KEY));
    }
  }

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
