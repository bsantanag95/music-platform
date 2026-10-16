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
//   DELETE FROM release_group WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-0000000009c%' OR mbid::text LIKE '5e0ce000-0000-4000-8000-0000000009e%' OR mbid::text LIKE '5e0ce000-0000-4000-8000-000000009d%';
//   DELETE FROM award WHERE slug = 'smoke-premio';
//   DELETE FROM release_calendar_entry WHERE release_group_mbid::text LIKE '5e0ce000-0000-4000-8000-000000009d%';
// Necesita las migraciones 0069 y 0070 aplicadas. Correr contra una BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-explore-collections.ts

import { and, eq, inArray, like, sql } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import {
  appUser,
  favorite,
  listenEntry,
  rating,
  review,
  award,
  awardCategory,
  awardCategoryEdition,
  awardCeremony,
  awardNomination,
  editorialAction,
  exploreCollectionSync,
  exploreCollectionTemplateState,
  releaseCalendarEntry,
  releaseGroup,
  userList,
  userListFeatured,
  userListItem,
  userRole,
} from "../src/db/schema";
import { COLLECTION_RAIL_LIMIT, CURATOR_DISPLAY_NAME, CURATOR_USERNAME, FEATURED_RAIL_LIMIT } from "../src/services/discovery/constants";
import { notGeneratedCollectionCondition } from "../src/services/discovery/collections/conditions";
import { createCoverResolver, type CoverResolver } from "../src/services/discovery/collections/covers";
import { generateCollection, previewCollection } from "../src/services/discovery/collections/generate";
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
import { COLLECTION_TEMPLATES, EVERGREEN, findTemplate, type CollectionTemplate } from "../src/services/discovery/collections/templates";
import {
  listCollectionArchive,
  listAlbumsFiltered,
  listCollectionFamilies,
  listCollections,
  listCollectionsHub,
  listFeaturedCollections,
} from "../src/services/discovery/discovery";
import { listFeaturedLists } from "../src/services/lists/community";
import { listEditorialLists } from "../src/services/lists/editorial";
import { listUserLists } from "../src/services/lists/lists";
import { listSavedLists, saveList } from "../src/services/lists/saved-lists";
import { findGeneratedCollection, generatedRefsFor } from "../src/services/discovery/collections/generated";
import { collectionTitle } from "../src/services/discovery/collections/titles";
import { presentCollection } from "../src/services/discovery/collections/presenters";
import { listCollectionSummaries } from "../src/services/discovery/collections/summaries";
import { COVERS_PER_FAMILY, listFamilyCovers, resetFamilyCoversCache } from "../src/services/discovery/family-covers";
import { FAMILY_GENRES_LIMIT, listFamilyGenres, resetFamilyGenresCache } from "../src/services/discovery/family-genres";
import { popularPeopleOf, popularityScoreQuery, resetAllTimeRankingCache } from "../src/services/discovery/popularity";
import { presentList } from "../src/lib/list-presentation";

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
    weight: 0,
    plan: async (now) => ({ periodKey: period(now), title: `Smoke ${key} ${period(now)}`, candidates: ids() }),
  };
}

/** Resolvedor sin red para las plantillas reales: acepta todos los candidatos. */
const offlineCovers: CoverResolver = {
  first: async (ids) => ids[0] ?? null,
  take: async (ids, limit) => [...new Set(ids)].slice(0, limit),
  spent: 0,
  exhausted: false,
};

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
  await db.delete(award).where(eq(award.slug, "smoke-premio")); // cascada: ceremonias, categorías y nominaciones
  await db
    .delete(releaseCalendarEntry)
    .where(like(sql`${releaseCalendarEntry.releaseGroupMbid}::text`, "5e0ce000-0000-4000-8000-000000009d%"));
  await db.delete(exploreCollectionSync).where(like(exploreCollectionSync.templateKey, "smoke-%"));
  await db.delete(releaseGroup).where(like(sql`${releaseGroup.mbid}::text`, "5e0ce000-0000-4000-8000-0000000009c%"));
  await db.delete(releaseGroup).where(like(sql`${releaseGroup.mbid}::text`, "5e0ce000-0000-4000-8000-000000009d%"));
  await db.delete(releaseGroup).where(like(sql`${releaseGroup.mbid}::text`, "5e0ce000-0000-4000-8000-0000000009e%"));
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
      () => db.insert(userListFeatured).values({ listId: list!.id, rank: 99, source: "template", family: "discovery" }),
      /chk_user_list_featured_template/,
      "una fila `template` sin plantilla/período se rechaza",
    );
    await expectRejects(
      () => db.insert(userListFeatured).values({ listId: list!.id, rank: 99, source: "otro" as never, family: "discovery" }),
      /chk_user_list_featured_source/,
      "un origen inválido se rechaza",
    );
    await expectRejects(
      () =>
        db.insert(userListFeatured).values({
          listId: list!.id,
          rank: 99,
          family: "discovery",
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
      { listId: list!.id, rank: 99, family: "discovery" },
      { listId: other!.id, rank: 99, family: "discovery" },
    ]);
    check(true, "`rank` ya no es único");
    // La familia es obligatoria y acotada (migración 0071).
    const [third] = await db
      .insert(userList)
      .values({ ownerId: curatorId, entityType: "release-group", title: "Smoke CHECK 3", audience: "public" })
      .returning({ id: userList.id });
    await expectRejects(
      () => db.insert(userListFeatured).values({ listId: third!.id, rank: 98, family: "inventada" as never }),
      /chk_user_list_featured_family/,
      "una familia fuera del vocabulario se rechaza",
    );
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
  // El catálogo de scratch ya trae las seis del día 0 generadas: el rail automático real está lleno, así que la
  // presencia de las sintéticas se comprueba sin tope y el tope se comprueba aparte.
  const railIds = (await listCollections(100)).map((row) => row.id);
  check(railIds.includes(listId), "la colección vigente aparece en el rail automático");
  check(railIds.includes(novemberRow.listId) && !railIds.includes(octoberRow.listId), "la vencida no aparece");
  check((await listCollections()).length <= COLLECTION_RAIL_LIMIT, `el riel respeta el tope de ${COLLECTION_RAIL_LIMIT}`);
  check((await listFeaturedCollections()).length <= FEATURED_RAIL_LIMIT, `el riel mezclado de Inicio respeta el tope de ${FEATURED_RAIL_LIMIT}`);
  await db
    .update(userListFeatured)
    .set({ startsAt: sql`now() + interval '1 day'`, expiresAt: sql`now() + interval '2 days'` })
    .where(eq(userListFeatured.listId, listId));
  check(!(await listCollections(100)).some((row) => row.id === listId), "una colección programada a futuro no aparece");
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
    plan: async () => {
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

    // Una colección sin álbumes no se lista (redesign-collections-hub): las oficiales de prueba llevan uno, salvo que se pida vacía.
    const official = async (title: string, over: Partial<typeof userList.$inferInsert> = {}, withAlbum = true) => {
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
      if (withAlbum) await db.insert(userListItem).values({ listId: list!.id, releaseGroupId: albumIds[0]!, position: 1 });
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

    const FAM = { family: "discovery" } as const;
    await rejectsCode(() => featureList(authorId, listA, FAM), "ROLE_REQUIRED", "destacar exige editorial.publish (un curador no puede)");
    await rejectsCode(() => featureList(adminId, draft, FAM), "FEATURE_NOT_PUBLISHED", "una lista en borrador no se destaca");
    await rejectsCode(() => featureList(adminId, foreign!.id, FAM), "FEATURE_NOT_ELIGIBLE", "una lista que no es de la cuenta curadora no se destaca");
    await rejectsCode(() => featureList(adminId, "00000000-0000-4000-8000-0000000000ff", FAM), "LIST_NOT_FOUND", "una lista inexistente da LIST_NOT_FOUND");
    // La familia es obligatoria al destacar a mano: sin ella la colección no tendría dónde ubicarse (ADR 0038).
    await rejectsCode(() => featureList(adminId, listA), "VALIDATION_ERROR", "destacar sin familia da VALIDATION_ERROR");
    await rejectsCode(
      () => featureList(adminId, listA, { family: "inventada" }),
      "VALIDATION_ERROR",
      "destacar con una familia desconocida da VALIDATION_ERROR",
    );
    const eligibleBefore = await listEligibleForFeature();
    check(eligibleBefore.some((l) => l.id === listA) && !eligibleBefore.some((l) => l.id === draft), "el selector ofrece solo oficiales publicadas");

    await featureList(adminId, listA, { family: "discovery" });
    await featureList(adminId, listB, { family: "awards" });
    const rowA = await rowOf(listA);
    // Con un solo riel y un solo tope (ADR 0038), otras colecciones sintéticas vigentes pueden dejarla
    // `beyond_limit`: lo que importa es que entró como `curated`, con su familia y participando del orden.
    check(
      ["in_rail", "beyond_limit"].includes(rowA?.status ?? "") && rowA?.source === "curated" && rowA?.family === "discovery",
      "una oficial destacada entra al riel como `curated`, con la familia elegida",
    );
    // Una colección sin álbumes no se lista en ninguna superficie y la consola lo dice (redesign-collections-hub).
    const listEmpty = await official("Smoke oficial vacía", {}, false);
    await featureList(adminId, listEmpty, { family: "awards" });
    check((await rowOf(listEmpty))?.status === "empty", "la consola marca `empty` una colección vigente sin álbumes");
    check(!(await listCollections(100)).some((c) => c.id === listEmpty), "una colección vacía no entra en el riel de `/explore`");
    check(!(await listCollectionsHub()).collections.some((c) => c.id === listEmpty), "ni en la página de colecciones");
    check(!(await listFeaturedCollections()).some((c) => c.id === listEmpty), "ni en la Inicio anónima");
    await db.insert(userListItem).values({ listId: listEmpty, releaseGroupId: albumIds[0]!, position: 1 });
    check((await listCollections(100)).some((c) => c.id === listEmpty), "al recibir un álbum entra en el riel");
    check((await listCollectionFamilies()).includes("awards"), "las familias con contenido incluyen la de una colección con álbumes");
    await unfeatureList(adminId, listEmpty);
    check(!(await listCollectionFamilies()).includes("awards") || (await listCollections(100)).some((c) => c.family === "awards"), "una familia sin colecciones deja de ofrecerse");
    check(!(await listEligibleForFeature()).some((l) => l.id === listA), "una ya destacada deja de ofrecerse");
    check((await actions(listA)).join() === "feature", "destacar registra `feature` en editorial_action");
    await featureList(adminId, listA, { family: "discovery" }); // idempotente: no duplica
    const [featuredA] = await db.execute<{ n: number }>(
      sql`SELECT count(*)::int AS n FROM user_list_featured WHERE list_id = ${listA}`,
    );
    check(featuredA!.n === 1, "destacar dos veces no duplica la fila");

    // Retiro de la oficial: sale del riel, la fila se conserva; republicar la devuelve.
    await db.update(userList).set({ isOfficial: false, officialWithdrawnAt: new Date() }).where(eq(userList.id, listA));
    check((await rowOf(listA))?.status === "withdrawn", "retirar la oficial la saca del riel (`withdrawn`)");
    check(!(await listFeaturedCollections()).some((c) => c.id === listA), "y no aparece en el riel público");
    await db.update(userList).set({ isOfficial: true, officialWithdrawnAt: null }).where(eq(userList.id, listA));
    // Igual que arriba: el tope único puede dejarla `beyond_limit`; lo que importa es que dejó de estar retirada
    // y que su fila nunca se recreó.
    check(
      ["in_rail", "beyond_limit"].includes((await rowOf(listA))?.status ?? ""),
      "republicarla la devuelve sin recrear la fila",
    );

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

    // Orden atómico: una sola secuencia sobre los dos orígenes (ADR 0038).
    const orderable = (await listFeaturedAdmin()).filter((row) => row.orderable).map((row) => row.listId);
    const wanted = [listB, listA, ...orderable.filter((id) => id !== listA && id !== listB)];
    await reorderFeatured(adminId, wanted);
    const afterOrder = (await listFeaturedAdmin()).filter((row) => row.orderable).map((row) => row.listId);
    check(afterOrder[0] === listB && afterOrder[1] === listA, "el nuevo orden se refleja (la primera arriba)");
    check(
      (await listCollections(100)).slice(0, 2).map((c) => c.id).join() === [listB, listA].join(),
      "y el riel respeta el nuevo orden",
    );
    check((await actions(listB)).includes("feature"), "reordenar registra `feature` en las listas afectadas");
    await rejectsCode(() => reorderFeatured(adminId, wanted.slice(1)), "FEATURED_ORDER_CONFLICT", "un conjunto distinto del vigente da FEATURED_ORDER_CONFLICT");
    await rejectsCode(() => reorderFeatured(adminId, [...wanted, wanted[0]!]), "FEATURED_ORDER_CONFLICT", "ids repetidos dan FEATURED_ORDER_CONFLICT");
    check((await listFeaturedAdmin()).filter((row) => row.orderable)[0]?.listId === listB, "un conflicto no cambia nada");

    // Una automática puede quedar por delante de una curada: el orden cruza los dos orígenes.
    const automaticOrderable = (await listFeaturedAdmin()).find((row) => row.group === "automatic" && row.orderable);
    if (automaticOrderable) {
      const mixed = [automaticOrderable.listId, ...wanted.filter((id) => id !== automaticOrderable.listId)];
      await reorderFeatured(adminId, mixed);
      const railNow = (await listCollections(100)).map((c) => c.id);
      check(railNow[0] === automaticOrderable.listId, "una automática puede encabezar el riel por delante de las curadas");
      await reorderFeatured(adminId, wanted);
    }

    // Riel único y página de colecciones.
    const railNow = await listCollections(100);
    const railIdsNow = railNow.map((c) => c.id);
    check(railIdsNow.includes(listB), "la curada está en el mismo riel que las generadas");
    check(
      railNow.some((c) => c.source === "template") && railNow.some((c) => c.source === "curated"),
      "el riel mezcla los dos orígenes",
    );
    check(
      railNow.every((c) => ["ephemeris", "awards", "releases", "discovery", "rankings"].includes(c.family)),
      "toda colección del riel trae su familia, venga de plantilla o de la mano de alguien",
    );
    check(
      railNow.find((c) => c.id === listB)?.family === "awards",
      "la familia que se eligió al destacar a mano es la que se lee",
    );
    const hub = await listCollectionsHub();
    check(
      hub.collections.some((c) => c.id === listB) && hub.collections.some((c) => c.source === "template"),
      "la página de colecciones trae una sola secuencia con los dos orígenes",
    );
    const generatedIds = railNow.filter((c) => c.source === "template").map((c) => c.id);
    const lists = await listFeaturedLists(null);
    check(
      lists.lists.every((l) => !generatedIds.includes(l.id) && l.id !== listB),
      "`/lists` → Destacadas no muestra ninguna colección, ni generada ni curada",
    );

    // Rotación: el período nuevo hereda peso y rank del anterior.
    const novemberId = november.status === "generated" ? november.listId : "";
    const weightBefore = (await rowOf(novemberId))!.weight;
    const december = await generateCollection(byMonth(() => albumIds.slice(2, 9)), new Date("2026-12-02T00:00:00Z"));
    const decemberId = december.status === "generated" ? december.listId : "";
    check((await rowOf(decemberId))?.weight === weightBefore, "el período nuevo hereda el peso del anterior");

    // La generación escribe en la fila la familia que declara la plantilla (migración 0071).
    const anniversariesRow = await db
      .select({ family: userListFeatured.family })
      .from(userListFeatured)
      .where(eq(userListFeatured.templateKey, "anniversaries"))
      .limit(1);
    if (anniversariesRow.length > 0) {
      check(anniversariesRow[0]!.family === "ephemeris", "la fila de `anniversaries` nace con la familia `ephemeris`");
    }

    // Archivo: las automáticas vencidas, con su fecha y su familia.
    const octoberId = october.status === "generated" ? october.listId : "";
    const archive = await listCollectionArchive({ family: "discovery" });
    const archived = archive.collections.find((c) => c.id === octoberId);
    check(archived !== undefined && !Number.isNaN(Date.parse(archived.endedAt)), "una automática vencida aparece en el archivo con su fecha");
    check(archive.collections.some((c) => c.id === novemberId), "el período anterior (noviembre) también vence al rotar");
    check(!archive.collections.some((c) => c.id === decemberId), "la vigente (diciembre) no está en el archivo");
    check(
      !(await listCollectionArchive({ family: "awards" })).collections.some((c) => c.id === octoberId),
      "el filtro por familia excluye las de otra familia",
    );
    check(archive.collections.every((c) => c.endedAt <= new Date().toISOString()), "todo lo archivado ya venció");
    await db.update(userList).set({ audience: "private" }).where(eq(userList.id, octoberId));
    check(
      !(await listCollectionArchive({ family: "discovery" })).collections.some((c) => c.id === octoberId),
      "una lista que dejó de ser pública sale del archivo",
    );
    await db.update(userList).set({ audience: "public" }).where(eq(userList.id, octoberId));

    // Una vencida sin álbumes tampoco entra en el archivo.
    await db.delete(userListItem).where(eq(userListItem.listId, octoberId));
    check(
      !(await listCollectionArchive({ family: "discovery" })).collections.some((c) => c.id === octoberId),
      "una colección vencida sin álbumes sale del archivo",
    );
    await db.insert(userListItem).values(albumIds.slice(0, 6).map((releaseGroupId, index) => ({ listId: octoberId, releaseGroupId, position: index + 1 })));

    // Resúmenes del hub: un lote de álbumes y un presentador por colección.
    const summaries = await listCollectionSummaries(hub.collections);
    check(
      [...summaries.keys()].every((id) => hub.collections.find((c) => c.id === id)?.source === "template"),
      "solo las colecciones generadas con presentador propio llevan resumen",
    );
    check(!summaries.has(listB), "una curada no lleva resumen");

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

    // Títulos localizados y ruta propia (openspec: localize-collection-titles).
    console.log("Títulos localizados y detalle bajo Explorar:");
    const generatedRows = await db
      .select({
        listId: userListFeatured.listId,
        templateKey: userListFeatured.templateKey,
        periodKey: userListFeatured.periodKey,
        title: userList.title,
      })
      .from(userListFeatured)
      .innerJoin(userList, eq(userList.id, userListFeatured.listId))
      .where(eq(userListFeatured.source, "template"));
    const real = generatedRows.filter((row) => !row.templateKey!.startsWith("smoke-"));
    check(real.length > 0, "hay colecciones generadas reales en la base");
    for (const row of real) {
      const es = collectionTitle(row.templateKey, row.periodKey, "es", row.title);
      const en = collectionTitle(row.templateKey, row.periodKey, "en", row.title);
      check(es.length > 0 && en.length > 0 && es !== en, `${row.templateKey}/${row.periodKey}: «${es}» / «${en}»`);
    }
    const evergreen = real.find((row) => row.templateKey === "one-per-decade");
    if (evergreen) {
      check(
        collectionTitle(evergreen.templateKey, evergreen.periodKey, "en", evergreen.title) === "One album per decade",
        "el título en inglés de una colección real es el del catálogo",
      );
    }

    const syntheticRef = await findGeneratedCollection(listId);
    check(
      syntheticRef?.templateKey === "smoke-evergreen" && syntheticRef.periodKey === "evergreen",
      "findGeneratedCollection reconoce una colección generada pública",
    );
    check((await findGeneratedCollection(listB)) === null, "una colección curada no es una generada");
    const personal = await official("Smoke oficial personal", { isOfficial: false, officialPublishedAt: null });
    check((await findGeneratedCollection(personal)) === null, "una lista que no es colección generada no tiene detalle bajo Explorar");
    await db.update(userList).set({ audience: "private" }).where(eq(userList.id, listId));
    check((await findGeneratedCollection(listId)) === null, "una colección que dejó de ser pública devuelve null (404)");
    await db.update(userList).set({ audience: "public" }).where(eq(userList.id, listId));
    await db.update(userList).set({ moderationStatus: "hidden" }).where(eq(userList.id, listId));
    check((await findGeneratedCollection(listId)) === null, "una colección oculta por moderación devuelve null (404)");
    await db.update(userList).set({ moderationStatus: "visible" }).where(eq(userList.id, listId));

    const refs = await generatedRefsFor([listId, listB, personal]);
    check(refs.has(listId) && !refs.has(listB) && !refs.has(personal), "generatedRefsFor solo incluye las generadas");

    // Listas guardadas: la colección generada se muestra con título del idioma y enlaza a Explorar.
    await saveList(adminId, listId, false);
    const saved = (await listSavedLists(adminId)).lists.find((entry) => entry.id === listId);
    check(
      saved?.generated?.templateKey === "smoke-evergreen",
      "la lista de guardadas expone plantilla y período de la colección generada",
    );
    const shown = presentList(saved!, "en");
    check(
      shown.href.startsWith("/explore/collections/") && !shown.href.includes("exploracion"),
      "y la presenta bajo Explorar, sin la cuenta curadora en la URL",
    );

    // El perfil de la cuenta curadora no lista las colecciones generadas.
    const profileLists = await listUserLists(CURATOR_USERNAME, null, 1, 50);
    check(
      !profileLists.lists.some((entry) => entry.id === listId),
      "la pestaña de listas de @exploracion no incluye colecciones generadas",
    );
    check(
      profileLists.lists.some((entry) => entry.id === listB),
      "las demás listas de la cuenta siguen listándose",
    );
  }

  console.log("Plantillas del día 0 (sintético):");
  {
    const SYN = (n: number) => `5e0ce000-0000-4000-8000-000000009d${n.toString(16).padStart(2, "0")}`;
    const make = async (rows: { n: number; date?: string; year?: number; cover: boolean }[]) =>
      (
        await db
          .insert(releaseGroup)
          .values(
            rows.map((r) => ({
              mbid: SYN(r.n),
              title: `Smoke día 0 ${r.n}`,
              category: "studio" as const,
              firstReleaseDate: r.date ?? null,
              firstReleaseYear: r.year ?? (r.date ? Number(r.date.slice(0, 4)) : null),
              coverThumbUrl: r.cover ? "https://example.test/cover.jpg" : null,
            })),
          )
          .returning({ id: releaseGroup.id, mbid: releaseGroup.mbid })
      ).sort((x, y) => String(x.mbid).localeCompare(String(y.mbid)));

    // --- grammy-winners: la ceremonia más reciente, solo ganadores con álbum, generales primero ---
    const awardRgs = await make(Array.from({ length: 9 }, (_, i) => ({ n: i, year: 2000 + i, cover: true })));
    const [syntheticAward] = await db.insert(award).values({ slug: "smoke-premio" }).returning({ id: award.id });
    const [ceremony] = await db
      .insert(awardCeremony)
      .values({ awardId: syntheticAward!.id, year: 2099, edition: 99, heldOn: "2099-02-01" })
      .returning({ id: awardCeremony.id });
    const category = async (key: string, tier: "general" | "genre", sortOrder: number) => {
      const [cat] = await db
        .insert(awardCategory)
        .values({ awardId: syntheticAward!.id, key, tier, subjectKind: "release_group", nameEs: key, nameEn: key, sortOrder })
        .returning({ id: awardCategory.id });
      const [edition] = await db
        .insert(awardCategoryEdition)
        .values({ ceremonyId: ceremony!.id, categoryId: cat!.id, coverage: "complete" })
        .returning({ id: awardCategoryEdition.id });
      return edition!.id;
    };
    const genreEdition = await category("categoria-genero", "genre", 2);
    const generalEdition = await category("categoria-general", "general", 1);
    const nominations = [
      // categoría de género insertada primero: aun así los generales deben ir antes
      { categoryEditionId: genreEdition, won: true, nomineeText: "g1", releaseGroupId: awardRgs[0]!.id, sortOrder: 1 },
      { categoryEditionId: genreEdition, won: false, nomineeText: "g2", releaseGroupId: awardRgs[1]!.id, sortOrder: 2 },
      { categoryEditionId: genreEdition, won: true, nomineeText: "g3", releaseGroupId: awardRgs[2]!.id, sortOrder: 3 },
      { categoryEditionId: generalEdition, won: true, nomineeText: "a1", releaseGroupId: awardRgs[3]!.id, sortOrder: 1 },
      { categoryEditionId: generalEdition, won: false, nomineeText: "a2", releaseGroupId: awardRgs[4]!.id, sortOrder: 2 },
      // ganador por disco ancla (la grabación no tiene álbum propio)
      { categoryEditionId: generalEdition, won: true, nomineeText: "a3", anchorReleaseGroupId: awardRgs[5]!.id, sortOrder: 3 },
      { categoryEditionId: generalEdition, won: true, nomineeText: "a4", releaseGroupId: awardRgs[6]!.id, sortOrder: 4 },
      { categoryEditionId: generalEdition, won: true, nomineeText: "a5", releaseGroupId: awardRgs[7]!.id, sortOrder: 5 },
      { categoryEditionId: generalEdition, won: true, nomineeText: "a6", releaseGroupId: awardRgs[8]!.id, sortOrder: 6 },
    ];
    await db.insert(awardNomination).values(nominations);

    const grammy = findTemplate("grammy-winners")!;
    const grammyPlan = await grammy.plan(new Date(), { covers: offlineCovers });
    check("candidates" in grammyPlan, "grammy-winners planifica con la ceremonia cargada");
    if ("candidates" in grammyPlan) {
      check(grammyPlan.periodKey === "smoke-premio-2099", "el período es <premio>-<año> de la ceremonia más reciente");
      check(grammyPlan.title === "Ganadores del smoke-premio 2099", "el título dice el premio y el año");
      check(
        grammyPlan.candidates.join() ===
          [awardRgs[3], awardRgs[5], awardRgs[6], awardRgs[7], awardRgs[8], awardRgs[0], awardRgs[2]].map((r) => r!.id).join(),
        "solo ganadores (con disco ancla incluido), los generales antes que los de género",
      );
    }
    const grammyPreview = await previewCollection(grammy, new Date(), offlineCovers);
    check(grammyPreview.reason === null && grammyPreview.albumIds.length === 7, "la vista previa lo da por válido (7 álbumes)");

    // Presentador de Premios (openspec: add-collection-presenters): categoría ganada por disco, ceremonia y enlace.
    const awardIds = awardRgs.map((r) => r!.id);
    const awardsContext = await presentCollection({
      templateKey: "grammy-winners",
      periodKey: "smoke-premio-2099",
      family: "awards",
      albumIds: awardIds,
      today: new Date(),
    });
    check(awardsContext.summary?.key === "awardsSummary", "el presentador de Premios resume la ceremonia");
    check(awardsContext.link?.href === "/awards/smoke-premio/2099", "y enlaza a la página de la ceremonia");
    check(awardsContext.numbered === false, "y no numera los discos");
    check(
      awardsContext.notes.get(awardRgs[3]!.id)?.key === "awardsWon1" && !awardsContext.notes.has(awardRgs[4]!.id),
      "cada ganador dice su categoría y el que solo fue nominado no lleva cartela",
    );
    check(awardsContext.notes.has(awardRgs[5]!.id), "el disco ancla de una canción ganadora también la lleva");
    const lostCeremony = await presentCollection({
      templateKey: "grammy-winners",
      periodKey: "smoke-premio-2000",
      family: "awards",
      albumIds: awardIds,
      today: new Date(),
    });
    check(lostCeremony.summary === undefined, "sin la ceremonia del período se abstiene y cae al presentador de la familia");

    // --- upcoming: el rango del calendario manda; completa con el catálogo ---
    const calendarRgs = await make(Array.from({ length: 4 }, (_, i) => ({ n: 0x10 + i, date: "2099-06-01", cover: true })));
    const future = "2099-06-01";
    await db.insert(releaseCalendarEntry).values(
      calendarRgs.map((rg, i) => ({
        releaseGroupMbid: rg.mbid!,
        title: `Smoke cal ${i}`,
        artistCreditName: "Smoke",
        releaseDate: future,
        primaryType: "Album" as const,
        hasCover: true,
        releaseGroupId: rg.id,
        // rangos invertidos: el último insertado es el de mejor rango
        anonymousRank: 4 - i,
      })),
    );
    const upcomingPlan = await findTemplate("upcoming")!.plan(new Date(), { covers: offlineCovers });
    check("candidates" in upcomingPlan, "upcoming planifica con calendario y catálogo");
    if ("candidates" in upcomingPlan) {
      const mine = upcomingPlan.candidates.filter((id) => calendarRgs.some((rg) => rg.id === id));
      check(mine.length === 4, "incluye los próximos del calendario enlazados al catálogo");
      check(
        mine.join() === [...calendarRgs].reverse().map((rg) => rg.id).join(),
        "los ordena por el rango de popularidad del calendario",
      );
      check(upcomingPlan.title === "Lo que viene" && upcomingPlan.periodKey === EVERGREEN, "es evergreen");
    }

    // --- anniversaries: múltiplos de 5 con ≥ 10 años, del mes; los redondos primero ---
    const NOW = new Date("2026-10-20T00:00:00Z");
    // Aniversarios muy antiguos (160+ años): ningún disco real los iguala, así que ocupan los primeros lugares.
    const anniversaryRows = [
      { n: 0x20, date: "1826-10-15" }, // 200
      { n: 0x21, date: "1836-10-03" }, // 190
      { n: 0x22, date: "1846-10-21" }, // 180
      { n: 0x23, date: "1851-10-09" }, // 175
      { n: 0x24, date: "1856-10-30" }, // 170
      { n: 0x25, date: "1861-10-12" }, // 165
      { n: 0x26, date: "1866-10-14" }, // 160
      { n: 0x27, date: "1864-10-14" }, // 162: no es múltiplo de 5
      { n: 0x28, date: "1826-11-21" }, // otro mes
      { n: 0x29, date: "2021-10-14" }, // 5 años: todavía no
    ];
    const anniversaryRgs = await make(anniversaryRows.map((r) => ({ ...r, cover: true })));
    const idOf = (n: number) => anniversaryRgs.find((rg) => rg.mbid === SYN(n))!.id;
    const anniversaryPlan = await findTemplate("anniversaries")!.plan(NOW, { covers: offlineCovers });
    check("candidates" in anniversaryPlan, "anniversaries planifica");
    if ("candidates" in anniversaryPlan) {
      check(anniversaryPlan.periodKey === "2026-10" && anniversaryPlan.title === "Cumplen años en octubre", "período y título del mes");
      const mine = anniversaryPlan.candidates.filter((id) => anniversaryRgs.some((rg) => rg.id === id));
      check(
        mine.join() === [0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26].map(idOf).join(),
        "los aniversarios redondos van del mayor al menor; sin el de 12 años, el de otro mes ni el de 5",
      );
    }

    // --- genre-spotlight: forma del resultado sobre el catálogo real (sin red) ---
    const spotlight = await findTemplate("genre-spotlight")!.plan(NOW, { covers: offlineCovers });
    if ("skip" in spotlight) {
      console.log(`  · genre-spotlight se omite sobre este catálogo: ${spotlight.skip}`);
    } else {
      check(/^2026-W43-[a-z-]+$/.test(spotlight.periodKey), "el período es la semana ISO y la familia");
      check(spotlight.title.startsWith("Para entrar a "), "el título nombra la familia");
      check(spotlight.candidates.length >= 6 && spotlight.candidates.length <= 12, "entre 6 y 12 álbumes");
      const years = await db
        .select({ id: releaseGroup.id, year: releaseGroup.firstReleaseYear })
        .from(releaseGroup)
        .where(inArray(releaseGroup.id, spotlight.candidates));
      const yearOf = new Map(years.map((row) => [row.id, Number(row.year)]));
      const ordered = spotlight.candidates.map((id) => yearOf.get(id)!);
      check(ordered.every((y, i) => i === 0 || y >= ordered[i - 1]!), "en orden cronológico");
      check(new Set(ordered.map((y) => Math.floor(y / 5))).size === ordered.length, "un álbum por era de 5 años");
    }

    // --- resolución de carátulas contra CAA simulado (sin red) ---
    const coverRgs = await make([
      { n: 0x30, year: 1990, cover: true },
      { n: 0x31, year: 1991, cover: false },
      { n: 0x32, year: 1992, cover: false },
    ]);
    const realFetch = globalThis.fetch;
    let coverRequests = 0;
    globalThis.fetch = (async () => {
      coverRequests += 1;
      return new Response(null, { status: 404 });
    }) as typeof fetch;
    try {
      const resolver = createCoverResolver();
      const taken = await resolver.take(coverRgs.map((rg) => rg.id), 5);
      check(taken.length === 1 && taken[0] === coverRgs[0]!.id, "solo se aceptan los discos con carátula confirmada");
      check(coverRequests === 2 && resolver.spent === 2, "los dos sin carátula costaron una petición cada uno");
      const [checked] = await db
        .select({ checkedAt: releaseGroup.coverCheckedAt })
        .from(releaseGroup)
        .where(eq(releaseGroup.id, coverRgs[1]!.id));
      check(checked?.checkedAt !== null, "la ausencia queda registrada (`cover_checked_at`)");
      await resolver.take(coverRgs.map((rg) => rg.id), 5);
      check(coverRequests === 2, "no se vuelven a pedir en la misma corrida");
      const second = createCoverResolver();
      await second.take(coverRgs.map((rg) => rg.id), 5);
      check(coverRequests === 2, "ni en otra corrida: la ausencia confirmada dura la ventana de negativos");
    } finally {
      globalThis.fetch = realFetch;
    }

    // --- --dry-run no escribe ---
    const [before] = await db.execute<{ f: number; s: number; l: number }>(
      sql`select (select count(*)::int from user_list_featured) f, (select count(*)::int from explore_collection_sync) s, (select count(*)::int from user_list) l`,
    );
    await previewCollection(findTemplate("anniversaries")!, NOW, offlineCovers);
    await previewCollection(grammy, new Date(), offlineCovers);
    const [afterDry] = await db.execute<{ f: number; s: number; l: number }>(
      sql`select (select count(*)::int from user_list_featured) f, (select count(*)::int from explore_collection_sync) s, (select count(*)::int from user_list) l`,
    );
    check(
      before!.f === afterDry!.f && before!.s === afterDry!.s && before!.l === afterDry!.l,
      "la vista previa no crea listas, filas destacadas ni corridas",
    );
  }

  console.log("Presentador de Novedades esenciales (sintético):");
  {
    const day = (offset: number) => new Date(Date.now() - offset * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const newRgs = await db
      .insert(releaseGroup)
      .values(
        [1, 5, 40, 75].map((daysAgo, i) => ({
          mbid: `5e0ce000-0000-4000-8000-0000000009e${i}`,
          title: `Smoke novedad ${i}`,
          category: "studio" as const,
          firstReleaseDate: day(daysAgo),
          firstReleaseYear: Number(day(daysAgo).slice(0, 4)),
          coverThumbUrl: "https://coverartarchive.org/smoke.jpg",
        })),
      )
      .returning({ id: releaseGroup.id });
    const ids = newRgs.map((r) => r.id);
    const context = await presentCollection({
      templateKey: "new-releases",
      periodKey: EVERGREEN,
      family: "releases",
      albumIds: ids,
      today: new Date(),
    });
    check(context.summary?.key === "newReleasesSummary", "el resumen dice el rango real de los discos mostrados");
    check(context.notes.get(ids[0]!)?.key === "newReleasesYesterday", "un disco de ayer dice «Ayer»");
    check(context.notes.get(ids[1]!)?.key === "newReleasesDaysAgo", "uno de hace 5 días dice «Hace 5 días»");
    check(context.notes.get(ids[2]!)?.key === "newReleasesWeeksAgo", "uno de hace 40 días dice semanas");
    const flat = (context.groups ?? []).flatMap((group) => group.albumIds);
    check(flat.length === ids.length && new Set(flat).size === ids.length, "los grupos por mes son una partición: ningún disco se pierde");
    check((context.groups ?? []).length >= 2 && (context.groups ?? [])[0]!.label?.key === "monthHeading", "hay un grupo por mes, con encabezado");
    // Consulta por lote: una sola petición de fechas para todos los discos, no una por disco.
    const started = Date.now();
    await presentCollection({ templateKey: "new-releases", periodKey: EVERGREEN, family: "releases", albumIds: ids, today: new Date() });
    check(Date.now() - started < 2000, "presentar la colección es una consulta por lote (rápido, sin una por disco)");
    await db.delete(releaseGroup).where(sql`mbid::text like '5e0ce000-0000-4000-8000-0000000009e%'`);
  }

  console.log("Presentadores del resto de las colecciones (sintético):");
  {
    const today = new Date();
    const lastMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 15));
    const period = `${lastMonth.getUTCFullYear()}-${String(lastMonth.getUTCMonth() + 1).padStart(2, "0")}`;
    const quarter = `${lastMonth.getUTCFullYear()}-Q${Math.floor(lastMonth.getUTCMonth() / 3) + 1}`;
    const inPeriod = new Date(Date.UTC(lastMonth.getUTCFullYear(), lastMonth.getUTCMonth(), 15, 12));

    const albums = await db
      .insert(releaseGroup)
      .values(
        [1994, 1976, 2003].map((year, i) => ({
          mbid: `5e0ce000-0000-4000-8000-0000000009e${i + 5}`,
          title: `Smoke ranking ${i}`,
          category: "studio" as const,
          firstReleaseDate: `${year}-${String(lastMonth.getUTCMonth() + 1).padStart(2, "0")}-05`,
          firstReleaseYear: year,
          coverThumbUrl: "https://coverartarchive.org/smoke.jpg",
        })),
      )
      .returning({ id: releaseGroup.id });
    const ids = albums.map((row) => row.id);

    // Tres votantes: el disco 0 recibe tres valoraciones del trimestre (4, 5 y 4,5) y dos reseñas visibles y una oculta.
    const voters: string[] = [];
    for (const label of ["a", "b", "c"]) {
      const [user] = await db
        .insert(appUser)
        .values({
          username: `smoke_feat_rank_${label}_${Date.now().toString(36)}`,
          email: `smoke_feat_rank_${label}_${Date.now().toString(36)}@example.test`,
          displayName: `Smoke ${label}`,
          passwordHash: null,
          profileVisibility: "public",
        })
        .returning({ id: appUser.id });
      voters.push(user!.id);
    }
    const stars = ["4.0", "5.0", "4.5"];
    await db.insert(rating).values(voters.map((userId, i) => ({ userId, releaseGroupId: ids[0]!, stars: stars[i]!, createdAt: inPeriod })));
    // Una valoración de otro trimestre no debe contar en la cifra del período.
    await db.insert(rating).values({ userId: voters[0]!, releaseGroupId: ids[1]!, stars: "1.0", createdAt: new Date("2001-01-01T00:00:00Z") });
    await db.insert(review).values([
      { userId: voters[0]!, releaseGroupId: ids[0]!, body: "smoke 1", createdAt: inPeriod },
      { userId: voters[1]!, releaseGroupId: ids[0]!, body: "smoke 2", createdAt: inPeriod },
      { userId: voters[2]!, releaseGroupId: ids[0]!, body: "smoke oculta", createdAt: inPeriod, moderationStatus: "hidden" },
    ]);

    const base = { periodKey: period, albumIds: ids, today };
    const topRated = await presentCollection({ ...base, templateKey: "top-rated-quarter", periodKey: quarter, family: "rankings" });
    const stat = topRated.notes.get(ids[0]!);
    check(topRated.numbered === true, "top-rated-quarter numera los discos");
    check(
      stat?.key === "topRatedNote" && Math.abs(Number((stat.params as { average: number }).average) - 4.5) < 0.001 && (stat.params as { count: number }).count === 3,
      "la cifra es el promedio y el conteo de las valoraciones del trimestre (4,5 · 3)",
    );
    check(!topRated.notes.has(ids[1]!), "una valoración de otro trimestre no cuenta y ese disco no lleva cifra");

    // "Lo más popular del mes" reemplazó a "Lo más reseñado del mes" (explore-popular-now).
    const popularMonthContext = await presentCollection({ ...base, templateKey: "popular-month", family: "rankings" });
    check(popularMonthContext.numbered === true, "popular-month numera los discos");
    const [periodStart, periodEnd] = [`${period}-01T00:00:00.000Z`, new Date(Date.UTC(lastMonth.getUTCFullYear(), lastMonth.getUTCMonth() + 1, 1)).toISOString()];
    check((await popularPeopleOf([ids[0]!], { start: periodStart, end: periodEnd })).get(ids[0]!) === 2, "popular-month cuenta las dos reseñas visibles del mes (la oculta no; las valoraciones fechan por su última modificación, que es hoy)");
    check(!popularMonthContext.notes.has(ids[0]!), "con menos de 5 personas el disco va sin cartela");

    const fallback = await presentCollection({ ...base, templateKey: "top-rated-quarter", periodKey: "evergreen", family: "rankings" });
    check(fallback.summary === undefined && fallback.numbered === true, "un período ilegible se abstiene y cae al presentador de la familia (numerado, sin resumen)");

    const anniversaries = await presentCollection({ ...base, templateKey: "anniversaries", family: "ephemeris" });
    const years = lastMonth.getUTCFullYear() - 1976;
    check(
      (anniversaries.notes.get(ids[1]!)?.params as { years: number } | undefined)?.years === years,
      `el aniversario se calcula contra el año del PERÍODO (${years} años), no contra el de hoy`,
    );
    check(anniversaries.summary?.key === "anniversariesSummary", "los aniversarios resumen el mes y el rango de años");

    const decade = await presentCollection({ ...base, templateKey: "one-per-decade", periodKey: "evergreen", family: "discovery" });
    check((decade.notes.get(ids[0]!)?.params as { decade: string } | undefined)?.decade === "1990", "un disco por década dice su década");

    const spotlight = await presentCollection({ ...base, templateKey: "genre-spotlight", periodKey: "2026-W41-punk", family: "discovery" });
    check((spotlight.notes.get(ids[2]!)?.params as { from: string } | undefined)?.from === "2000", "género por eras dice la era del disco");
    const unknown = await presentCollection({ ...base, templateKey: "genre-spotlight", periodKey: "2026-W41-no-existe", family: "discovery" });
    check(unknown.summary === undefined, "una familia de géneros desconocida se abstiene y cae a la familia");

    await db.delete(releaseGroup).where(sql`mbid::text like '5e0ce000-0000-4000-8000-0000000009e%'`);
  }

  console.log("Popularidad por personas distintas (explore-popular-now):");
  {
    // Tres discos y cuatro personas sintéticas. P: diez escuchas de una persona y una valoración de otra (2 personas, 2 puntos).
    // Q: favorito, reseña y valoración de la misma persona (tope 4, 1 persona). R: una escucha privada y otra de una cuenta
    // desactivada (no cuentan). Una escucha vieja de P queda fuera de la ventana de 30 días.
    const albums = await db
      .insert(releaseGroup)
      .values(
        ["p", "q", "r"].map((tag, i) => ({
          mbid: `5e0ce000-0000-4000-8000-0000000009f${4 + i}`,
          title: `Smoke popular ${tag.toUpperCase()}`,
          category: "studio" as const,
          firstReleaseYear: 2001,
          coverThumbUrl: `https://coverartarchive.org/smoke-pop-${tag}.jpg`,
        })),
      )
      .returning({ id: releaseGroup.id });
    const [P, Q, R] = albums.map((row) => row.id) as [string, string, string];
    const suffix = Date.now().toString(36);
    const people: string[] = [];
    for (const label of ["a", "b", "c", "d"]) {
      const [user] = await db
        .insert(appUser)
        .values({
          username: `smoke_feat_pop_${label}_${suffix}`,
          email: `smoke_feat_pop_${label}_${suffix}@example.test`,
          displayName: `Smoke pop ${label}`,
          passwordHash: null,
          profileVisibility: "public",
          deactivatedAt: label === "d" ? new Date() : null,
        })
        .returning({ id: appUser.id });
      people.push(user!.id);
    }
    const [a, b, c, d] = people as [string, string, string, string];
    try {
      const listen = (userId: string, releaseGroupId: string, audience = "public", createdAt = new Date()) => ({
        userId,
        releaseGroupId,
        listenContext: "relisten",
        audience,
        createdAt,
      });
      await db.insert(listenEntry).values(Array.from({ length: 10 }, () => listen(a, P)));
      await db.insert(listenEntry).values(listen(c, P, "public", new Date(Date.now() - 120 * 24 * 3600 * 1000)));
      await db.insert(rating).values({ userId: b, releaseGroupId: P, stars: "2.0" });
      await db.insert(favorite).values({ userId: a, releaseGroupId: Q, audience: "public" });
      await db.insert(review).values({ userId: a, releaseGroupId: Q, body: "smoke popular" });
      await db.insert(rating).values({ userId: a, releaseGroupId: Q, stars: "5.0" });
      await db.insert(listenEntry).values([listen(c, R, "private"), listen(d, R)]);

      type Row = { id: string; score: number; people: number };
      const scoreOf = async (since?: string) => {
        const rows = (await db.execute(popularityScoreQuery("album", { ids: [P, Q, R], minPeople: 1, since }))) as unknown as Row[];
        return new Map(rows.map((row) => [row.id, { score: Number(row.score), people: Number(row.people) }]));
      };
      const ever = await scoreOf();
      check(ever.get(P)?.people === 3 && ever.get(P)?.score === 3, "diez escuchas de una persona cuentan una vez (P: 3 personas, 3 puntos de siempre)");
      check(ever.get(Q)?.people === 1 && ever.get(Q)?.score === 4, "una persona muy activa llega al tope de 4 (Q)");
      check(!ever.has(R), "una escucha privada y una cuenta desactivada no cuentan (R)");
      const month = await scoreOf(new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString());
      check(month.get(P)?.people === 2, "la ventana de 30 días deja fuera la escucha de hace 4 meses");

      resetAllTimeRankingCache();
      const popularList = await listAlbumsFiltered(sql`"release_group"."id" in (${P}, ${Q}, ${R})`, { sort: "popular" });
      check(
        popularList.albums.map((album) => album.title.slice(-1)).join("") === "QPR",
        "el orden «Populares» va por la puntuación de siempre (Q 4, P 3) y deja al final el disco sin actividad",
      );
    } finally {
      // El ON DELETE CASCADE de app_user borra escuchas, valoraciones, reseñas y favoritos.
      await db.delete(appUser).where(inArray(appUser.id, people));
      await db.delete(releaseGroup).where(inArray(releaseGroup.id, [P, Q, R]));
      resetAllTimeRankingCache();
    }
  }

  console.log("Orden por defecto «Destacados» y géneros de la familia (redesign-family-view):");
  {
    // Cuatro discos sintéticos sin valoraciones ni premios: lo que decide es estudio, carátula, año y fecha futura.
    const day = 24 * 3600 * 1000;
    const future = new Date(Date.now() + 30 * day).toISOString().slice(0, 10);
    const rows = [
      { tag: "a", title: "Smoke orden A (estudio, carátula, 2000)", category: "studio" as const, year: 2000, date: "2000-05-01", cover: "https://coverartarchive.org/smoke-a.jpg" },
      { tag: "b", title: "Smoke orden B (sencillo, carátula, 2020)", category: "single_ep" as const, year: 2020, date: "2020-05-01", cover: "https://coverartarchive.org/smoke-b.jpg" },
      { tag: "c", title: "Smoke orden C (estudio, sin carátula, 2010)", category: "studio" as const, year: 2010, date: "2010-05-01", cover: null },
      { tag: "d", title: "Smoke orden D (estudio, carátula, por salir)", category: "studio" as const, year: Number(future.slice(0, 4)), date: future, cover: "https://coverartarchive.org/smoke-d.jpg" },
    ];
    const inserted = await db
      .insert(releaseGroup)
      .values(
        rows.map((row) => ({
          mbid: `5e0ce000-0000-4000-8000-0000000009f${row.tag === "a" ? 0 : row.tag === "b" ? 1 : row.tag === "c" ? 2 : 3}`,
          title: row.title,
          category: row.category,
          firstReleaseDate: row.date,
          firstReleaseYear: row.year,
          coverThumbUrl: row.cover,
        })),
      )
      .returning({ id: releaseGroup.id, title: releaseGroup.title });
    try {
      const ids = inserted.map((row) => row.id);
      const only = sql`"release_group"."id" in (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`;
      const page = await listAlbumsFiltered(only, { sort: "best" });
      const tagOf = (title: string) => title.match(/Smoke orden (\w)/)?.[1];
      check(
        page.albums.map((album) => tagOf(album.title)).join("") === "ACBD",
        "el orden por defecto: estudio con carátula, estudio sin carátula, sencillo y, al final, el que aún no sale",
      );
      check(page.albums[3]?.firstReleaseYear === Math.max(...rows.map((row) => row.year)), "el disco por salir queda último aunque su año sea el más reciente");
      const newest = await listAlbumsFiltered(only, { sort: "newest" });
      check(tagOf(newest.albums[0]!.title) === "D", "«Más recientes» no cambia: el disco por salir sigue primero");
    } finally {
      await db.delete(releaseGroup).where(sql`mbid::text like '5e0ce000-0000-4000-8000-0000000009f%'`);
    }

    resetFamilyGenresCache();
    const genres = await listFamilyGenres("rock");
    if (genres.length > 0) {
      check(genres.length <= FAMILY_GENRES_LIMIT, `la familia trae como mucho ${FAMILY_GENRES_LIMIT} géneros`);
      check(genres.every((item) => item.slug.length > 0 && item.name.length > 0), "cada género trae slug y nombre");
      check(new Set(genres.map((item) => item.slug)).size === genres.length, "los géneros no se repiten");
      check((await listFamilyGenres("rock")) === genres || JSON.stringify(await listFamilyGenres("rock")) === JSON.stringify(genres), "la segunda lectura sale de la caché");
    }
    check((await listFamilyGenres("inexistente")).length === 0, "una familia desconocida no trae géneros");
    resetFamilyGenresCache();
  }

  console.log("Carátulas de las familias de géneros (visual-genre-families):");
  {
    resetFamilyCoversCache();
    const first = await listFamilyCovers();
    check([...first.values()].every((covers) => covers.length >= 1 && covers.length <= COVERS_PER_FAMILY), `cada familia con carátulas trae entre 1 y ${COVERS_PER_FAMILY}`);
    const all = [...first.values()].flat();
    check(all.every((cover) => typeof cover === "string" && cover.length > 0), "las carátulas son URLs de miniaturas");
    // Un disco se usa en una sola familia salvo el relleno de las que quedarían con menos de dos.
    check(new Set(all).size >= all.length - first.size, "los discos no se repiten entre familias (salvo el relleno)");
    resetFamilyCoversCache();
    const second = await listFamilyCovers();
    check(JSON.stringify([...first.entries()]) === JSON.stringify([...second.entries()]), "la selección es estable entre lecturas (mismo desempate)");
    check((await listFamilyCovers()) === second, "la segunda lectura sale de la caché en memoria");
    resetFamilyCoversCache();
  }

  console.log("Plantillas reales (solo lectura, sin red):");
  for (const real of COLLECTION_TEMPLATES) {
    const result = await real.plan(new Date(), { covers: offlineCovers });
    check(
      "skip" in result || Array.isArray(result.candidates),
      `${real.key}: el SQL se ejecuta (${"skip" in result ? `omitida: ${result.skip}` : `${result.candidates.length} candidatos`})`,
    );
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
