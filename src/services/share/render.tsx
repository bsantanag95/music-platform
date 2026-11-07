import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import { appDomain } from "@/lib/share/app-url";
import { BRAND_COLORS, BRAND_MONOGRAM } from "@/lib/share/brand-tokens";
import type { ShareFormat, ShareLocale } from "@/lib/share/kinds";
import { AuthorNote, CommunityScore, CoverTile, IdentityBadge, LINK_FORMAT, LaminaFrame, SleeveWithRecord } from "./frame/LaminaFrame";
import { STORY_FORMAT, STORY_RECORD, STORY_RECORD_COMPACT, StoryFrame, StoryRecord } from "./frame/StoryFrame";
import { AlbumBars, DiscographyChart, SongGrid } from "./frame/DiscographyFrame";
import { TierChart } from "./frame/TierFrame";
import { POST_FORMAT, SQUARE_FORMAT, TopFive, TopGrid, TopTen, type TopCanvas } from "./frame/TopFrame";
import { loadShareFonts } from "./fonts";
import { shareAppName, shareTranslator } from "./i18n";
import { MAX_COVER_SIDE, loadEmbeddedCover, loadEmbeddedImage } from "./images";
import type { ShareDiscographyAlbumCard, ShareDiscographyCard, ShareImageRef, ShareMedia, ShareTarget, ShareTierCard, ShareTopCard } from "./types";

// Renderizador único de las imágenes de compartir (spec share-images; design D1). Resuelve las imágenes del
// medio (en paralelo, cada una con su recuadro tipográfico si falla), arma el marco y devuelve el PNG. Sin
// objetivo (inexistente, oculto, cuenta desactivada) dibuja la imagen genérica de la marca.

const MOSAIC_TILE = 184;
const PHOTO_SIDE = 340;
const AVATAR_SIDE = 260;
const PROFILE_COVER = 104;
const STORY_PHOTO = 640;
const STORY_AVATAR = 420;
const STORY_MOSAIC_GAP = 8;
const NOTE_SCALE_STORY = 1.35;

interface RenderOptions {
  /** Por defecto, Enlace. */
  format?: ShareFormat;
  headers?: Record<string, string>;
  /**
   * `Cache-Control` si alguna imagen con URL no se pudo obtener (fuente lenta o caída): esa versión no debe
   * quedar congelada en el CDN con el recuadro tipográfico en lugar de la carátula.
   */
  degradedCacheControl?: string;
}

/** Medio con las imágenes ya embebidas (data URI) o `null` donde va el recuadro. */
type EmbeddedImage = ShareImageRef & { src: string | null };

async function embed(ref: ShareImageRef, maxSide: number = MAX_COVER_SIDE): Promise<EmbeddedImage> {
  const src = maxSide === MAX_COVER_SIDE ? await loadEmbeddedCover(ref.url) : await loadEmbeddedImage(ref.url, maxSide);
  return { ...ref, src };
}

/** Alguna imagen tenía URL pero no se pudo embeber: la imagen salió con recuadros en su lugar. */
function isDegraded(images: Array<{ url: string | null; src: string | null }>): boolean {
  return images.some((image) => image.url !== null && image.src === null);
}

interface RenderedMedia {
  node: ReactNode;
  covers: EmbeddedImage[];
  degraded: boolean;
}

async function renderMedia(media: ShareMedia): Promise<RenderedMedia> {
  switch (media.type) {
    case "cover": {
      const cover = await embed(media.cover);
      return {
        node: (
          <SleeveWithRecord size={MAX_COVER_SIDE}>
            <CoverTile src={cover.src} size={MAX_COVER_SIDE} title={cover.fallbackTitle} subtitle={cover.fallbackSubtitle} />
          </SleeveWithRecord>
        ),
        covers: [],
        degraded: isDegraded([cover]),
      };
    }
    case "mosaic": {
      // Un solo disco se dibuja como carátula con su disco detrás; de 2 a 4, en grilla de 2×2.
      if (media.covers.length === 1) return renderMedia({ type: "cover", cover: media.covers[0]! });
      const covers = await Promise.all(media.covers.slice(0, 4).map((c) => embed(c)));
      if (covers.length === 0) return { node: <TypographicMark />, covers: [], degraded: false };
      return {
        node: (
          <div style={{ display: "flex", flexWrap: "wrap", width: MOSAIC_TILE * 2 + 8, gap: 8 }}>
            {covers.map((c, i) => (
              <CoverTile key={i} src={c.src} size={MOSAIC_TILE} title={c.fallbackTitle} subtitle={c.fallbackSubtitle} />
            ))}
          </div>
        ),
        covers: [],
        degraded: isDegraded(covers),
      };
    }
    case "photo": {
      const photo = await embed(media.photo, PHOTO_SIDE);
      return {
        node: photo.src ? (
          // eslint-disable-next-line @next/next/no-img-element -- imagen para el renderizador, no para el navegador
          <img src={photo.src} width={PHOTO_SIDE} height={PHOTO_SIDE} alt="" style={{ objectFit: "cover", borderRadius: 12 }} />
        ) : (
          <IdentityBadge src={null} letter={media.monogram} variant={1} size={PHOTO_SIDE} />
        ),
        covers: [],
        degraded: isDegraded([photo]),
      };
    }
    case "identity": {
      const [avatar, covers] = await Promise.all([
        loadEmbeddedImage(media.avatarUrl, AVATAR_SIDE),
        Promise.all(media.covers.slice(0, 3).map((c) => embed(c))),
      ]);
      return {
        node: <IdentityBadge src={avatar} letter={media.monogram} variant={media.monogramVariant} size={AVATAR_SIDE} />,
        covers,
        degraded: isDegraded([...covers, { url: media.avatarUrl, src: avatar }]),
      };
    }
    case "typographic":
      return { node: <TypographicMark />, covers: [], degraded: false };
  }
}

/** Medio de la Historia: la carátula nunca pasa de 250 px, así que el ancho lo llena el vinilo dibujado. */
async function renderStoryMedia(media: ShareMedia, size: number): Promise<RenderedMedia> {
  switch (media.type) {
    case "cover": {
      const cover = await embed(media.cover);
      return {
        node: (
          <StoryRecord size={size}>
            <CoverTile src={cover.src} size={MAX_COVER_SIDE} title={cover.fallbackTitle} subtitle={cover.fallbackSubtitle} />
          </StoryRecord>
        ),
        covers: [],
        degraded: isDegraded([cover]),
      };
    }
    case "mosaic": {
      if (media.covers.length === 1) return renderStoryMedia({ type: "cover", cover: media.covers[0]! }, size);
      const covers = await Promise.all(media.covers.slice(0, 4).map((c) => embed(c)));
      if (covers.length === 0) return { node: <TypographicMark size={size} />, covers: [], degraded: false };
      return {
        node: (
          <StoryRecord size={size}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", width: MAX_COVER_SIDE * 2 + STORY_MOSAIC_GAP, gap: STORY_MOSAIC_GAP }}>
              {covers.map((c, i) => (
                <CoverTile key={i} src={c.src} size={MAX_COVER_SIDE} title={c.fallbackTitle} subtitle={c.fallbackSubtitle} />
              ))}
            </div>
          </StoryRecord>
        ),
        covers: [],
        degraded: isDegraded(covers),
      };
    }
    case "photo": {
      const side = Math.min(STORY_PHOTO, size);
      const photo = await embed(media.photo, side);
      return {
        node: photo.src ? (
          // eslint-disable-next-line @next/next/no-img-element -- imagen para el renderizador, no para el navegador
          <img src={photo.src} width={side} height={side} alt="" style={{ objectFit: "cover", borderRadius: 16 }} />
        ) : (
          <IdentityBadge src={null} letter={media.monogram} variant={1} size={side} />
        ),
        covers: [],
        degraded: isDegraded([photo]),
      };
    }
    case "identity": {
      const [avatar, covers] = await Promise.all([
        loadEmbeddedImage(media.avatarUrl, STORY_AVATAR),
        Promise.all(media.covers.slice(0, 3).map((c) => embed(c))),
      ]);
      return {
        node: <IdentityBadge src={avatar} letter={media.monogram} variant={media.monogramVariant} size={STORY_AVATAR} />,
        covers,
        degraded: isDegraded([...covers, { url: media.avatarUrl, src: avatar }]),
      };
    }
    case "typographic":
      return { node: <TypographicMark size={size} />, covers: [], degraded: false };
  }
}

function TypographicMark({ size = 340 }: { size?: number }) {
  return (
    <div
      style={{
        display: "flex",
        width: size,
        height: size,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: BRAND_COLORS.inkSurface,
        border: `1px solid ${BRAND_COLORS.inkBorder}`,
        color: BRAND_COLORS.amber,
        fontSize: Math.round(size * 0.47),
        fontWeight: 700,
      }}
    >
      {BRAND_MONOGRAM}
    </div>
  );
}

function ProfileCovers({ covers }: { covers: EmbeddedImage[] }) {
  if (covers.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
      {covers.map((c, i) => (
        <CoverTile key={i} src={c.src} size={PROFILE_COVER} title={c.fallbackTitle} subtitle={c.fallbackSubtitle} />
      ))}
    </div>
  );
}

const FORMAT_SIZE = { link: LINK_FORMAT, story: STORY_FORMAT, post: POST_FORMAT, square: SQUARE_FORMAT } as const;

/** Cuerpo de una Lámina en un formato que no es Enlace. */
async function renderTop(top: ShareTopCard, canvas: TopCanvas, target: ShareTarget, appName: string, domain: string) {
  const embedded = await Promise.all(top.items.map((item) => embed(item.cover)));
  const items = top.items.map((item, index) => ({ ...item, src: embedded[index]!.src }));
  const frame = { canvas, title: target.card.title, byline: top.byline, credits: target.card.credits, appName, domain, items };
  const Body = top.format === "top5" ? TopFive : top.format === "top10" ? TopTen : TopGrid;
  return { element: <Body {...frame} />, degraded: isDegraded(embedded) };
}

/** Una discografía usa el mismo cuerpo en todos sus formatos, Enlace incluido. */
async function renderDiscography(card: ShareDiscographyCard, canvas: TopCanvas | "link", target: ShareTarget, appName: string, domain: string) {
  if (card.songs) {
    const frame = { canvas, title: target.card.title, byline: card.byline, credits: target.card.credits, appName, domain };
    const covers = await Promise.all(card.songs.columns.map((column) => embed(column.cover)));
    const element = (
      <SongGrid
        {...frame}
        columns={card.songs.columns.map((column, index) => ({ ...column, src: covers[index]!.src }))}
        rows={card.songs.rows}
        moreDiscs={card.songs.moreDiscs}
        moreTracks={card.songs.moreTracks}
        rated={card.rated}
        progressPercent={card.progressPercent}
      />
    );
    return { element, degraded: isDegraded(covers) };
  }
  const embedded = await Promise.all(card.discs.map((disc) => embed(disc.cover)));
  const element = (
    <DiscographyChart
      canvas={canvas}
      title={target.card.title}
      byline={card.byline}
      credits={target.card.credits}
      appName={appName}
      domain={domain}
      discs={card.discs.map((disc, index) => ({ ...disc, src: embedded[index]!.src }))}
      more={card.more}
      rated={card.rated}
      progressPercent={card.progressPercent}
    />
  );
  return { element, degraded: isDegraded(embedded) };
}

/** Tier list: el mismo cuerpo en todos sus formatos, Enlace incluido. */
async function renderTier(card: ShareTierCard, canvas: TopCanvas | "link", target: ShareTarget, appName: string, domain: string) {
  const embedded = await Promise.all(card.tiers.map((items) => Promise.all(items.map((item) => embed(item.cover)))));
  const rows = card.tiers.map((items, tier) => ({
    tier,
    label: card.labels[tier] ?? "",
    items: items.map((item, index) => ({ src: embedded[tier]![index]!.src, title: item.title, stars: item.stars, detailedScore: item.detailedScore })),
  }));
  const element = (
    <TierChart canvas={canvas} title={target.card.title} byline={card.byline} credits={target.card.credits} appName={appName} domain={domain} rows={rows} />
  );
  return { element, degraded: isDegraded(embedded.flat()) };
}

/** Lámina de un álbum: el mismo cuerpo en todos sus formatos. */
async function renderDiscographyAlbum(card: ShareDiscographyAlbumCard, canvas: TopCanvas | "link", target: ShareTarget, appName: string, domain: string) {
  const cover = await embed(card.cover);
  const element = (
    <AlbumBars
      canvas={canvas}
      title={target.card.title}
      byline={card.byline}
      credits={target.card.credits}
      appName={appName}
      domain={domain}
      src={cover.src}
      albumTitle={target.card.title}
      year={card.year}
      tracks={card.tracks}
      more={card.more}
      rated={target.card.meta[0] ?? ""}
    />
  );
  return { element, degraded: isDegraded([cover]) };
}

async function buildElement(
  target: ShareTarget | null,
  locale: ShareLocale,
  format: ShareFormat,
): Promise<{ element: ReactNode; degraded: boolean }> {
  const appName = shareAppName(locale);
  const domain = appDomain();
  const story = format === "story";
  const Frame = story ? StoryFrame : LaminaFrame;
  if (!target) {
    const t = shareTranslator(locale);
    const element = (
      <Frame
        kicker=""
        title={t("share.image.unavailable")}
        subtitle={null}
        meta={[]}
        media={<TypographicMark size={story ? STORY_RECORD_COMPACT : 340} />}
        credits={[]}
        appName={appName}
        domain={domain}
      />
    );
    return { element, degraded: false };
  }

  const t = shareTranslator(locale);
  const { card } = target;
  if (card.discography) return renderDiscography(card.discography, format, target, appName, domain);
  if (card.discographyAlbum) return renderDiscographyAlbum(card.discographyAlbum, format, target, appName, domain);
  if (card.tier) return renderTier(card.tier, format, target, appName, domain);
  if (card.top && format !== "link") return renderTop(card.top, format, target, appName, domain);
  const media = story
    ? await renderStoryMedia(card.media, card.quote ? STORY_RECORD_COMPACT : STORY_RECORD)
    : await renderMedia(card.media);
  const authored = Boolean(card.quote || card.byline);
  const extra = authored ? (
    <AuthorNote quote={card.quote ?? null} stars={card.stars ?? null} detailedScore={card.detailedScore ?? null} byline={card.byline ?? null} scale={story ? NOTE_SCALE_STORY : 1} />
  ) : card.community ? (
    <CommunityScore
      score={card.community}
      countLabel={t("share.image.communityAverage", { count: card.community.count })}
    />
  ) : (
    <ProfileCovers covers={media.covers} />
  );
  const element = (
    <Frame
      kicker={card.kicker}
      title={card.title}
      subtitle={card.subtitle}
      meta={card.meta}
      media={media.node}
      extra={extra}
      compact={Boolean(card.quote)}
      credits={card.credits}
      appName={appName}
      domain={domain}
    />
  );
  return { element, degraded: media.degraded };
}

/** PNG de un objetivo en el formato pedido (Enlace por defecto), o la imagen genérica si es `null`. */
export async function renderShareImage(
  target: ShareTarget | null,
  locale: ShareLocale,
  options: RenderOptions = {},
): Promise<ImageResponse> {
  const format = options.format ?? "link";
  const [{ element, degraded }, fonts] = await Promise.all([buildElement(target, locale, format), loadShareFonts()]);
  const headers = { ...options.headers };
  if (degraded && options.degradedCacheControl) headers["Cache-Control"] = options.degradedCacheControl;
  return new ImageResponse(element as React.ReactElement, { ...FORMAT_SIZE[target ? format : format === "story" ? "story" : "link"], fonts, headers });
}
