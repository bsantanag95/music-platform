import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { appUser } from "@/db/schema";
import { localeHref } from "@/lib/catalog-links";
import type { ShareFormat, ShareLocale } from "@/lib/share/kinds";
import { isValidUuid } from "@/lib/validation";
import { activeUserCondition } from "@/services/auth/account-status";
import {
  bestRated,
  getDiscographyAlbum,
  getDiscographyLamina,
  type DiscographyLamina,
  type DiscographySongDisc,
} from "@/services/laminas/discography";
import { shareTranslator } from "../i18n";
import type { ShareImageRef, ShareSongGrid, ShareTarget } from "../types";
import { mosaicCredits } from "./collections";
import { clipDescription, downloadName } from "./shared";

// Objetivo de una discografía y de la Lámina de un álbum (spec share-images). Como anónimo, solo con la marca y si un anónimo puede
// ver el perfil; con `owner`, la imagen privada de su dueño. La referencia son identificadores, como exige `share_event`: estable si
// cambia el usuario, y permite borrar los eventos con la cuenta. La imagen muestra la vista que eligió el dueño.

/** Tope del ADR 0053. */
const MAX_COVERS = 10;
const MAX_DISCS = 20;
const MAX_TRACKS = 20;
const MAX_ALBUM_TRACKS = 25;
const FORMATS: ShareFormat[] = ["post", "link", "story"];

export function discographyRef(userId: string, artistId: string, albumId?: string): string {
  return albumId ? `${userId}.${artistId}.${albumId}` : `${userId}.${artistId}`;
}

/** Referencia para los metadatos de la página, que solo tiene el usuario de la ruta. */
export async function discographyRefFor(username: string, artistId: string, albumId?: string): Promise<string | null> {
  const [owner] = await db.select({ id: appUser.id }).from(appUser).where(eq(appUser.username, username)).limit(1);
  return owner ? discographyRef(owner.id, artistId, albumId) : null;
}

function parseRef(ref: string): { userId: string; artistId: string; albumId: string | null } | null {
  const [userId, artistId, albumId, ...rest] = ref.split(".");
  if (!userId || !artistId || rest.length > 0 || !isValidUuid(userId) || !isValidUuid(artistId)) return null;
  if (albumId !== undefined && !isValidUuid(albumId)) return null;
  return { userId, artistId, albumId: albumId ?? null };
}

function coverOf(disc: { title: string; coverThumbUrl: string | null }, withCover: boolean): ShareImageRef {
  return { url: withCover ? disc.coverThumbUrl : null, fallbackTitle: disc.title, fallbackSubtitle: null };
}

/** Grilla Por canción: los discos con alguna valoración, hasta 20 por 20, con carátula solo en los 10 mejor valorados. */
function songGrid(discs: DiscographySongDisc[]): ShareSongGrid {
  const shown = discs.slice(0, MAX_DISCS);
  const scored = shown.flatMap((disc) => (disc.score ? [{ ...disc.score, disc }] : []));
  const withCover = new Set([...bestRated(scored, MAX_COVERS)].map((entry) => entry.disc));
  const longest = Math.max(0, ...shown.map((disc) => disc.tracks.length));
  const rows = Array.from({ length: Math.min(longest, MAX_TRACKS) }, (_, index) => shown.map((disc) => disc.tracks[index]?.score ?? null));
  return {
    columns: shown.map((disc) => ({ cover: coverOf(disc, withCover.has(disc)), title: disc.title, year: disc.year, score: disc.score })),
    rows,
    moreDiscs: discs.length - shown.length,
    moreTracks: Math.max(longest - MAX_TRACKS, 0),
  };
}

function bylineOf(owner: { username: string; displayName: string | null }) {
  const handle = `@${owner.username}`;
  const name = owner.displayName?.trim();
  return { handle, byline: name ? `${name} · ${handle}` : handle };
}

function lamina(lamina: DiscographyLamina, ref: string, locale: ShareLocale, owner: { username: string; displayName: string | null }): ShareTarget {
  const t = shareTranslator(locale);
  const { handle, byline } = bylineOf(owner);
  const shown = lamina.discs.slice(0, MAX_DISCS);
  const withCover = bestRated(shown, MAX_COVERS);
  const discs = shown.map((disc) => ({ cover: coverOf(disc, withCover.has(disc)), title: disc.title, year: disc.year, stars: disc.stars, detailedScore: disc.detailedScore }));
  const songs = lamina.view === "song" ? songGrid(lamina.songDiscs) : undefined;
  const songCount = new Set(lamina.songDiscs.flatMap((disc) => disc.tracks.filter((track) => track.score).map((track) => track.recordingId))).size;
  const rated = songs ? t("share.image.discographySongsRated", { count: songCount }) : t("share.image.discographyRated", { count: lamina.discs.length });
  const title = t("share.image.titles.discography", { artist: lamina.artist.name, author: handle });
  const covers = (songs ? songs.columns.map((column) => column.cover) : discs.map((disc) => disc.cover)).filter((cover) => cover.url);
  return {
    kind: "discography",
    ref,
    locale,
    canonicalPath: localeHref(locale, `/users/${encodeURIComponent(owner.username)}/artist/${lamina.artist.id}`),
    title,
    description: clipDescription(`${rated} · ${(songs ? lamina.songDiscs : shown).slice(0, MAX_DISCS).map((disc) => disc.title).join(" · ")}`),
    imageAlt: title,
    downloadName: downloadName(lamina.artist.name, "discografia", owner.username),
    formats: FORMATS,
    card: {
      kicker: t("share.image.kicker.discography"),
      title: lamina.artist.name,
      subtitle: handle,
      meta: [rated],
      media: { type: "typographic" },
      community: null,
      credits: mosaicCredits(t, covers),
      discography: {
        byline,
        rated,
        discs,
        more: lamina.discs.length - shown.length,
        progressPercent: lamina.progress.kind === "journey" ? lamina.progress.percent : null,
        songs,
      },
    },
  };
}

export async function loadDiscographyTarget(ref: string, locale: ShareLocale, options: { owner?: string } = {}): Promise<ShareTarget | null> {
  const parsed = parseRef(ref);
  if (!parsed || (options.owner && options.owner !== parsed.userId)) return null;
  const [owner] = await db
    .select({ username: appUser.username, displayName: appUser.displayName })
    .from(appUser)
    .where(and(eq(appUser.id, parsed.userId), activeUserCondition()))
    .limit(1);
  if (!owner) return null;
  const viewer = options.owner ?? null;

  if (!parsed.albumId) {
    const found = await getDiscographyLamina(owner.username, parsed.artistId, viewer);
    return found && found.missing === 0 ? lamina(found, ref, locale, owner) : null;
  }

  const album = await getDiscographyAlbum(owner.username, parsed.artistId, parsed.albumId, viewer);
  if (!album || album.missing > 0) return null;
  const t = shareTranslator(locale);
  const { handle, byline } = bylineOf(owner);
  const { disc } = album;
  const tracks = disc.tracks.slice(0, MAX_ALBUM_TRACKS).map((track) => ({ number: track.number, title: track.title, score: track.score }));
  const rated = t("share.image.discographySongsRated", { count: disc.tracks.filter((track) => track.score).length });
  const title = t("share.image.titles.discographyAlbum", { album: disc.title, author: handle });
  const cover = coverOf(disc, true);
  return {
    kind: "discography",
    ref,
    locale,
    canonicalPath: localeHref(locale, `/users/${encodeURIComponent(owner.username)}/artist/${parsed.artistId}?disco=${disc.id}`),
    title,
    description: clipDescription(`${album.lamina.artist.name} · ${rated}`),
    imageAlt: title,
    downloadName: downloadName(album.lamina.artist.name, disc.title, owner.username),
    formats: FORMATS,
    card: {
      kicker: t("share.image.kicker.discographyAlbum"),
      title: disc.title,
      subtitle: handle,
      meta: [rated],
      media: { type: "cover", cover },
      community: null,
      credits: mosaicCredits(t, [cover]),
      discographyAlbum: { byline, cover, year: disc.year, tracks, more: disc.tracks.length - tracks.length },
    },
  };
}
