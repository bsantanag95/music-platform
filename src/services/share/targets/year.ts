import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { appUser } from "@/db/schema";
import { localeHref } from "@/lib/catalog-links";
import { requestTimeZone } from "@/lib/request-time-zone";
import type { ShareFormat, ShareLocale } from "@/lib/share/kinds";
import { isValidUuid } from "@/lib/validation";
import { activeUserCondition } from "@/services/auth/account-status";
import { getYearInDiscs, parseYear, type YearInDiscsView } from "@/services/laminas/year";
import { shareTranslator } from "../i18n";
import type { ShareImageRef, ShareTarget } from "../types";
import { mosaicCredits } from "./collections";
import { clipDescription, downloadName } from "./shared";

// Objetivo de "Tu año en discos" (spec year-laminas, openspec: add-year-in-discs-phase1 y phase2). Como anónimo, solo con la marca del año y si un anónimo puede ver
// el perfil, contado en la zona guardada en la marca; con `owner`, la imagen privada del dueño en su zona. Esta fase compone el marco común: cifras y hasta 4
// carátulas, las de los discos más escuchados (ADR 0049). El calendario completo en la imagen llega en la Fase 2.

const FORMATS: ShareFormat[] = ["post", "link", "story"];

/** Tope del ADR 0051: el año, curado por su dueño, junta hasta 10 carátulas distintas. */
const MAX_COVERS = 10;

/**
 * Qué discos llevan carátula: primero los del Top 5 y después el disco de cada mes, de los meses con más escuchas a los de menos, hasta 10 distintos. Un
 * disco que ya tiene carátula la conserva en cualquier lugar donde aparezca.
 */
export function yearCoverIds(top: readonly { id: string }[], months: readonly { discs: { id: string; listens: number }[] }[]): Set<string> {
  const withCover = new Set<string>();
  for (const disc of top) if (withCover.size < MAX_COVERS) withCover.add(disc.id);
  const byActivity = months
    .flatMap((month) => (month.discs[0] ? [{ disc: month.discs[0], listens: month.discs.reduce((sum, disc) => sum + disc.listens, 0) }] : []))
    .sort((a, b) => b.listens - a.listens);
  for (const { disc } of byActivity) if (withCover.size < MAX_COVERS) withCover.add(disc.id);
  return withCover;
}

export function yearRef(userId: string, year: number): string {
  return `${userId}.${year}`;
}

/** Referencia para los metadatos de la página, que solo tiene el usuario de la ruta. */
export async function yearRefFor(username: string, year: number): Promise<string | null> {
  const [owner] = await db.select({ id: appUser.id }).from(appUser).where(eq(appUser.username, username)).limit(1);
  return owner ? yearRef(owner.id, year) : null;
}

export function parseYearRef(ref: string): { userId: string; year: number } | null {
  const [userId, rawYear, ...rest] = ref.split(".");
  const year = parseYear(rawYear);
  if (!userId || year === null || rest.length > 0 || !isValidUuid(userId)) return null;
  return { userId, year };
}

/** Cifras para la imagen. Las que son cero no van: en una imagen que se publica, "0 artistas descubiertos" se lee como un reproche. */
function statsLine(t: ReturnType<typeof shareTranslator>, data: YearInDiscsView): string[] {
  const { listens, discs, newDiscs, artistsDiscovered } = data.stats;
  return [
    t("share.image.year.listens", { count: listens }),
    discs > 0 ? t("share.image.year.discs", { count: discs }) : null,
    newDiscs > 0 ? t("share.image.year.newDiscs", { count: newDiscs }) : null,
    artistsDiscovered > 0 ? t("share.image.year.artistsDiscovered", { count: artistsDiscovered }) : null,
  ].filter((line): line is string => line !== null);
}

export async function loadYearTarget(ref: string, locale: ShareLocale, options: { owner?: string } = {}): Promise<ShareTarget | null> {
  const parsed = parseYearRef(ref);
  if (!parsed || (options.owner && options.owner !== parsed.userId)) return null;
  const [owner] = await db
    .select({ username: appUser.username, displayName: appUser.displayName })
    .from(appUser)
    .where(and(eq(appUser.id, parsed.userId), activeUserCondition()))
    .limit(1);
  if (!owner) return null;
  // El dueño ve su año en su zona; cualquier otra lectura usa la de la marca, y la zona que se pase acá no cuenta.
  const zone = options.owner ? await requestTimeZone() : "UTC";
  const data = await getYearInDiscs(owner.username, parsed.year, options.owner ?? null, zone);
  if (!data) return null;

  const t = shareTranslator(locale);
  const handle = `@${owner.username}`;
  const title = data.inProgress ? t("share.image.year.titleInProgress", { year: data.year }) : t("share.image.year.title", { year: data.year });
  const withCover = yearCoverIds(data.top, data.months);
  const ref_ = (disc: { id: string; title: string; artistName: string | null; coverThumbUrl: string | null }): ShareImageRef => ({
    url: withCover.has(disc.id) ? disc.coverThumbUrl : null,
    fallbackTitle: disc.title,
    fallbackSubtitle: disc.artistName,
  });
  // Enlace, en el marco común: las cuatro primeras del Top 5 (ADR 0049).
  const covers: ShareImageRef[] = data.top.slice(0, 4).map(ref_);
  const monthName = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
  const meta = statsLine(t, data);
  const fullTitle = t("share.image.titles.year", { title, author: handle });
  return {
    kind: "year",
    ref,
    locale,
    canonicalPath: localeHref(locale, `/users/${encodeURIComponent(owner.username)}/year/${data.year}`),
    title: fullTitle,
    description: clipDescription(`${meta.join(" · ")} · ${data.top.map((disc) => disc.title).join(" · ")}`),
    imageAlt: fullTitle,
    downloadName: downloadName(owner.username, String(data.year), "discos"),
    formats: FORMATS,
    card: {
      kicker: t("share.image.kicker.year"),
      title,
      subtitle: handle,
      meta,
      media: covers.length > 0 ? { type: "mosaic", covers } : { type: "typographic" },
      community: null,
      credits: mosaicCredits(t, [...data.top, ...data.months.flatMap((month) => month.discs.slice(0, 1))].map(ref_).filter((cover) => cover.url)),
      year: {
        byline: handle,
        topLabel: t("share.image.year.top"),
        top: data.top.map((disc) => ({ cover: ref_(disc), title: disc.title })),
        months: data.months.map((month) => ({
          label: monthName.format(new Date(Date.UTC(data.year, month.month - 1, 1))).replace(".", ""),
          disc: month.discs[0] ? { cover: ref_(month.discs[0]), title: month.discs[0].title } : null,
        })),
        stats: meta,
      },
    },
  };
}
