import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { award, awardCategory, awardCategoryEdition, awardCeremony, awardNomination, awardTierRankSql } from "@/db/schema";
import type { CategoryName } from "./read";

// Contexto de premios de una colección de ganadores (`grammy-winners`): qué ceremonia es y qué categoría ganó cada
// álbum. Es lo que dice, disco por disco, por qué está en la colección. Consultas planas a la base, como el resto de
// la lectura de premios; nada sale a otra fuente al renderizar.

export interface WonCategory {
  key: string;
  name: CategoryName;
}

export interface CeremonyContext {
  awardSlug: string;
  year: number;
  /** Fecha de la ceremonia (`YYYY-MM-DD`). */
  heldOn: string;
  /** Categorías que ganó cada álbum (id del álbum → categorías), las generales primero. */
  wonByAlbum: Map<string, WonCategory[]>;
}

/** El período de una colección de premios es `<premio>-<año>` (`grammy-2025`). */
export function parseAwardPeriod(periodKey: string): { awardSlug: string; year: number } | null {
  const match = /^([a-z0-9]+(?:-[a-z0-9]+)*)-(\d{4})$/.exec(periodKey);
  return match ? { awardSlug: match[1]!, year: Number(match[2]) } : null;
}

/**
 * La ceremonia del período y, para los álbumes dados, las categorías que ganaron en ella (directo o como disco ancla
 * de una canción ganadora). `null` si el período no es de premios o la ceremonia ya no está cargada.
 */
export async function ceremonyContext(periodKey: string, albumIds: string[]): Promise<CeremonyContext | null> {
  const parsed = parseAwardPeriod(periodKey);
  if (!parsed) return null;

  const [ceremony] = await db
    .select({ id: awardCeremony.id, heldOn: awardCeremony.heldOn })
    .from(awardCeremony)
    .innerJoin(award, eq(award.id, awardCeremony.awardId))
    .where(and(eq(award.slug, parsed.awardSlug), eq(awardCeremony.year, parsed.year)))
    .limit(1);
  if (!ceremony) return null;

  const wonByAlbum = new Map<string, WonCategory[]>();
  const ids = [...new Set(albumIds)];
  if (ids.length > 0) {
    const albumId = sql<string>`coalesce(${awardNomination.releaseGroupId}, ${awardNomination.anchorReleaseGroupId})`;
    const rows = await db
      .select({ albumId, key: awardCategory.key, nameEs: awardCategory.nameEs, nameEn: awardCategory.nameEn })
      .from(awardNomination)
      .innerJoin(awardCategoryEdition, eq(awardCategoryEdition.id, awardNomination.categoryEditionId))
      .innerJoin(awardCategory, eq(awardCategory.id, awardCategoryEdition.categoryId))
      .where(
        and(
          eq(awardCategoryEdition.ceremonyId, ceremony.id),
          eq(awardNomination.won, true),
          inArray(albumId, ids),
        ),
      )
      // Por nivel (general, álbum, género), como en la página de la ceremonia.
      .orderBy(awardTierRankSql(awardCategory.tier), awardCategory.sortOrder);
    for (const row of rows) {
      const list = wonByAlbum.get(row.albumId) ?? [];
      list.push({ key: row.key, name: { es: row.nameEs, en: row.nameEn } });
      wonByAlbum.set(row.albumId, list);
    }
  }

  return { awardSlug: parsed.awardSlug, year: parsed.year, heldOn: ceremony.heldOn, wonByAlbum };
}
