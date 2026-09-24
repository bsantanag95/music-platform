import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { releaseGroup, release } from "@/db/schema";
import { pickRepresentativeRelease } from "./representative-release";
import { ingestReleaseTracklist, persistCanonicalReleaseDate } from "./ingest-release";
import { fetchReleaseEditions, saveReleaseEditions } from "./release-editions";

export type RecanonicalizeResult =
  | { status: "skipped"; reason: "not-found" | "no-mbid" }
  | {
      status: "dry-run";
      currentReleaseMbid: string | null;
      chosenReleaseMbid: string | null;
      wouldChangeEdition: boolean;
      canonicalFirstReleaseDate: string | null;
    }
  | { status: "unchanged"; currentReleaseMbid: string | null }
  | { status: "recanonicalized"; fromReleaseMbid: string | null; toReleaseMbid: string };

/**
 * Reevalúa la edición representativa de un `release_group` sobre TODAS sus
 * ediciones y, si difiere de la actual, mueve la marca de representativa
 * (openspec: enrich-album-editions-and-credits). Nunca crea, modifica
 * ni elimina filas de `rating`, `favorite`, `comment`, `listen_entry`,
 * `user_list_item`, `user_pinned_item` ni `collection_entry` — todas
 * referencian el `release_group`, no la edición (openspec:
 * canonicalize-release-group / capability `album-edition-selection`).
 *
 * Siempre repuebla la fecha de lanzamiento canónica del release-group,
 * cambie o no la edición (fase de backfill del script).
 *
 * `dryRun` informa qué haría sin escribir nada.
 */
export async function recanonicalizeReleaseGroup(
  releaseGroupId: string,
  { dryRun = false }: { dryRun?: boolean } = {},
): Promise<RecanonicalizeResult> {
  const [rg] = await db
    .select()
    .from(releaseGroup)
    .where(eq(releaseGroup.id, releaseGroupId))
    .limit(1);

  if (!rg) return { status: "skipped", reason: "not-found" };
  if (!rg.mbid) return { status: "skipped", reason: "no-mbid" };

  const { editions, firstReleaseDate } = await fetchReleaseEditions(rg.mbid);
  const chosen = pickRepresentativeRelease(editions);

  const [current] = await db
    .select()
    .from(release)
    .where(and(eq(release.releaseGroupId, releaseGroupId), eq(release.isRepresentative, true)))
    .limit(1);
  const currentReleaseMbid = current?.mbid ?? null;
  const chosenReleaseMbid = chosen?.id ?? null;
  const wouldChangeEdition = chosenReleaseMbid !== null && chosenReleaseMbid !== currentReleaseMbid;

  if (dryRun) {
    return {
      status: "dry-run",
      currentReleaseMbid,
      chosenReleaseMbid,
      wouldChangeEdition,
      canonicalFirstReleaseDate: firstReleaseDate ?? null,
    };
  }

  await persistCanonicalReleaseDate(releaseGroupId, firstReleaseDate);
  await saveReleaseEditions(releaseGroupId, editions);

  if (!wouldChangeEdition || !chosen) {
    return { status: "unchanged", currentReleaseMbid };
  }

  // Intercambio de la marca, no borrado: la representativa anterior queda como
  // edición no representativa (su tracklist sigue siendo válida) y las tablas
  // sociales no se tocan. Si la nueva ya está ingerida (una variante), basta con
  // mover la marca en una transacción; si no, se desmarca la anterior y se ingiere
  // la nueva como representativa. Si esa ingesta fallara, la vista de álbum la
  // re-ingiere en la siguiente visita (self-heal).
  const [alreadyIngested] = await db
    .select()
    .from(release)
    .where(and(eq(release.releaseGroupId, releaseGroupId), eq(release.mbid, chosen.id)))
    .limit(1);

  await db.transaction(async (tx) => {
    await tx
      .update(release)
      .set({ isRepresentative: false })
      .where(and(eq(release.releaseGroupId, releaseGroupId), eq(release.isRepresentative, true)));
    if (alreadyIngested) {
      await tx.update(release).set({ isRepresentative: true }).where(eq(release.id, alreadyIngested.id));
    }
  });
  if (!alreadyIngested) {
    await ingestReleaseTracklist(releaseGroupId, chosen, { representative: true });
  }

  return { status: "recanonicalized", fromReleaseMbid: currentReleaseMbid, toReleaseMbid: chosen.id };
}
