import { and, eq, notInArray, or } from "drizzle-orm";
import { db } from "@/db";
import { artist, artistSupport, membership, membershipPeriod, type ArtistRow } from "@/db/schema";
import {
  mapArtistMemberships,
  mapArtistSupports,
  mapArtistType,
  type MappedArtistMembership,
} from "../musicbrainz/mappers";
import type { MBArtistDetail, MBArtistSummary } from "../musicbrainz/types";
import { upsertArtistFromMb } from "./artist-upsert";

// Guardado de la alineación de un artista desde su lookup de MusicBrainz (openspec:
// add-artist-lineup-data, design D1–D3): pertenencias con sus períodos y músicos de apoyo,
// en la transacción de quien llama. Lo usan la sincronización fría (`ensureArtistMemberships`)
// y la actualización cada 30 días (`syncArtistProfileFacts`), con la misma request.

type Executor = Pick<typeof db, "insert" | "delete" | "update">;

type Period = Pick<MappedArtistMembership, "joinedOn" | "leftOn">;

/**
 * Fechas resumidas de una pertenencia a partir de sus relaciones en MusicBrainz, que pueden
 * ser el mismo período partido por rol (guitarra con inicio, voz con fin) o períodos distintos
 * (se fue y volvió). Toma el inicio conocido más temprano y el fin conocido más tardío, salvo
 * que:
 * - un período sin inicio terminó antes de ese inicio: hubo una etapa anterior de inicio
 *   desconocido → inicio nulo;
 * - un período sin fin empezó después de ese fin: volvió y sigue (o no se sabe) → fin nulo.
 * Si aun así el fin queda antes del inicio (dato incoherente en MusicBrainz), ambos quedan
 * nulos: no se inventa una fecha ni se viola el `CHECK left_on >= joined_on`.
 */
export function mergeMembershipDates(periods: Period[]): Period {
  const joins = periods.map((p) => p.joinedOn).filter((d): d is string => d !== null).sort();
  const lefts = periods.map((p) => p.leftOn).filter((d): d is string => d !== null).sort();
  let joinedOn = joins[0] ?? null;
  let leftOn = lefts[lefts.length - 1] ?? null;
  if (joinedOn && periods.some((p) => p.joinedOn === null && p.leftOn !== null && p.leftOn < joinedOn!)) joinedOn = null;
  if (leftOn && periods.some((p) => p.leftOn === null && p.joinedOn !== null && p.joinedOn > leftOn!)) leftOn = null;
  if (joinedOn && leftOn && leftOn < joinedOn) return { joinedOn: null, leftOn: null };
  return { joinedOn, leftOn };
}

/** Resumen de `membership` (rol y fechas) derivado de los períodos del par. */
export function membershipSummary(periods: MappedArtistMembership[]): { role: string | null } & Period {
  const instruments = [...new Set(periods.flatMap((period) => period.instruments))].sort();
  return { role: instruments.length ? instruments.join(", ") : null, ...mergeMembershipDates(periods) };
}

/**
 * Reemplaza la alineación del artista vista desde su lado (design D3): un grupo reemplaza
 * sus pertenencias y el apoyo que recibe; una persona, sus pertenencias y el apoyo que da y
 * recibe. Las relaciones de otros artistas no se tocan. Los artistas relacionados que faltan
 * entran como stub con su tipo. Marca `lineup_synced_at` y `memberships_synced_at`.
 */
export async function saveArtistLineup(
  tx: Executor,
  current: Pick<ArtistRow, "id">,
  detail: MBArtistDetail,
  now = new Date(),
): Promise<void> {
  // El propio artista también pasa por el upsert (una vez): un stub toma su tipo real, que el
  // trigger de `membership` exige (persona → grupo).
  const resolved = new Map<string, string>();
  const resolve = async (summary: MBArtistSummary): Promise<string> => {
    const known = resolved.get(summary.id);
    if (known) return known;
    const row = await upsertArtistFromMb(summary.id, summary.name, summary.type ?? undefined, summary.disambiguation || null, tx);
    resolved.set(summary.id, row.id);
    return row.id;
  };

  const isGroup = mapArtistType(detail.type) === "group";
  const byPair = new Map<string, MappedArtistMembership[]>();
  for (const item of mapArtistMemberships(detail)) {
    const key = `${item.person.id}:${item.group.id}`;
    byPair.set(key, [...(byPair.get(key) ?? []), item]);
  }

  const relatedIds: string[] = [];
  for (const periods of byPair.values()) {
    const first = periods[0]!;
    const personId = await resolve(first.person);
    const groupId = await resolve(first.group);
    relatedIds.push(isGroup ? personId : groupId);
    const summary = membershipSummary(periods);
    const [row] = await tx
      .insert(membership)
      .values({ personId, groupId, ...summary })
      .onConflictDoUpdate({ target: [membership.personId, membership.groupId], set: summary })
      .returning({ id: membership.id });
    if (!row) throw new Error(`No se pudo guardar la pertenencia ${personId} ↔ ${groupId}`);
    // Los períodos del par se reemplazan completos: ambos lados ven las mismas relaciones.
    await tx.delete(membershipPeriod).where(eq(membershipPeriod.membershipId, row.id));
    await tx.insert(membershipPeriod).values(
      periods.map((period) => ({
        membershipId: row.id,
        beginDate: period.beginDate,
        endDate: period.endDate,
        ended: period.ended,
        instruments: period.instruments,
        isFounder: period.isFounder,
        isAdditional: period.isAdditional,
      })),
    );
  }

  const scope = eq(isGroup ? membership.groupId : membership.personId, current.id);
  const relatedColumn = isGroup ? membership.personId : membership.groupId;
  await tx.delete(membership).where(relatedIds.length ? and(scope, notInArray(relatedColumn, relatedIds)) : scope);

  const supports = [];
  for (const item of mapArtistSupports(detail)) {
    supports.push({
      musicianId: await resolve(item.musician),
      artistId: await resolve(item.supported),
      kind: item.kind,
      instruments: item.instruments,
      beginDate: item.beginDate,
      endDate: item.endDate,
      ended: item.ended,
    });
  }
  // Un grupo nunca es músico de apoyo (la relación exige una persona), así que el mismo
  // alcance cubre ambos casos: el apoyo que el artista da y el que recibe.
  await tx
    .delete(artistSupport)
    .where(or(eq(artistSupport.musicianId, current.id), eq(artistSupport.artistId, current.id)));
  if (supports.length > 0) await tx.insert(artistSupport).values(supports);

  // Guardar la alineación también cubre la sincronización fría de pertenencias: una persona
  // sincronizada en segundo plano no repite la request cuando alguien la visita.
  await tx.update(artist).set({ lineupSyncedAt: now, membershipsSyncedAt: now }).where(eq(artist.id, current.id));
}

