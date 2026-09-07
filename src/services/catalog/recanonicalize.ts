import { eq } from "drizzle-orm";
import { db } from "@/db";
import { releaseGroup, release } from "@/db/schema";
import { musicbrainz } from "../musicbrainz/client";
import { pickRepresentativeRelease } from "./representative-release";
import { findOrIngestTracklist, persistCanonicalReleaseDate } from "./ingest-release";

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
 * Reevalúa la edición representativa de un `release_group` y, si difiere de
 * la ingerida, reemplaza sus filas `release` + `track`. Nunca crea, modifica
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

  const rgWithReleases = await musicbrainz.getReleaseGroup(rg.mbid);
  const chosen = pickRepresentativeRelease(rgWithReleases.releases ?? []);

  const [current] = await db
    .select()
    .from(release)
    .where(eq(release.releaseGroupId, releaseGroupId))
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
      canonicalFirstReleaseDate: rgWithReleases["first-release-date"] ?? null,
    };
  }

  await persistCanonicalReleaseDate(releaseGroupId, rgWithReleases["first-release-date"]);

  if (!wouldChangeEdition) {
    return { status: "unchanged", currentReleaseMbid };
  }

  // Un solo DELETE (atómico); `track` cae por `ON DELETE cascade`. Las tablas
  // sociales no se tocan. La re-ingesta usa el mismo path determinista que un
  // álbum nuevo, así que vuelve a elegir `chosen`; si fallara, la vista de
  // álbum la re-ingiere en la siguiente visita (self-heal).
  await db.delete(release).where(eq(release.releaseGroupId, releaseGroupId));
  await findOrIngestTracklist(releaseGroupId, rg.mbid);

  return { status: "recanonicalized", fromReleaseMbid: currentReleaseMbid, toReleaseMbid: chosen!.id };
}
