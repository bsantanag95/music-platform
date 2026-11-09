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

// Objetivo de "Tu año en discos" (spec year-laminas, openspec: add-year-in-discs-phase1). Como anónimo, solo con la marca del año y si un anónimo puede ver
// el perfil, contado en la zona guardada en la marca; con `owner`, la imagen privada del dueño en su zona. Esta fase compone el marco común: cifras y hasta 4
// carátulas, las de los discos más escuchados (ADR 0049). El calendario completo en la imagen llega en la Fase 2.

const FORMATS: ShareFormat[] = ["link", "story"];

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
  const covers: ShareImageRef[] = data.topDiscs.map((disc) => ({ url: disc.coverThumbUrl, fallbackTitle: disc.title, fallbackSubtitle: disc.artistName }));
  const meta = statsLine(t, data);
  const fullTitle = t("share.image.titles.year", { title, author: handle });
  return {
    kind: "year",
    ref,
    locale,
    canonicalPath: localeHref(locale, `/users/${encodeURIComponent(owner.username)}/year/${data.year}`),
    title: fullTitle,
    description: clipDescription(`${meta.join(" · ")} · ${data.topDiscs.map((disc) => disc.title).join(" · ")}`),
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
      credits: mosaicCredits(t, covers.filter((cover) => cover.url)),
    },
  };
}
