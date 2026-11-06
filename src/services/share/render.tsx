import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import { appDomain } from "@/lib/share/app-url";
import { BRAND_COLORS, BRAND_MONOGRAM } from "@/lib/share/brand-tokens";
import type { ShareLocale } from "@/lib/share/kinds";
import { AuthorNote, CommunityScore, CoverTile, IdentityBadge, LINK_FORMAT, LaminaFrame, SleeveWithRecord } from "./frame/LaminaFrame";
import { loadShareFonts } from "./fonts";
import { shareAppName, shareTranslator } from "./i18n";
import { MAX_COVER_SIDE, loadEmbeddedCover, loadEmbeddedImage } from "./images";
import type { ShareImageRef, ShareMedia, ShareTarget } from "./types";

// Renderizador único de las imágenes de compartir (spec share-images; design D1). Resuelve las imágenes del
// medio (en paralelo, cada una con su recuadro tipográfico si falla), arma el marco y devuelve el PNG. Sin
// objetivo (inexistente, oculto, cuenta desactivada) dibuja la imagen genérica de la marca.

const MOSAIC_TILE = 184;
const PHOTO_SIDE = 340;
const AVATAR_SIDE = 260;
const PROFILE_COVER = 104;

interface RenderOptions {
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

function TypographicMark() {
  return (
    <div
      style={{
        display: "flex",
        width: 340,
        height: 340,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: BRAND_COLORS.inkSurface,
        border: `1px solid ${BRAND_COLORS.inkBorder}`,
        color: BRAND_COLORS.amber,
        fontSize: 160,
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

async function buildElement(target: ShareTarget | null, locale: ShareLocale): Promise<{ element: ReactNode; degraded: boolean }> {
  const appName = shareAppName(locale);
  const domain = appDomain();
  if (!target) {
    const t = shareTranslator(locale);
    const element = (
      <LaminaFrame
        kicker=""
        title={t("share.image.unavailable")}
        subtitle={null}
        meta={[]}
        media={<TypographicMark />}
        credits={[]}
        appName={appName}
        domain={domain}
      />
    );
    return { element, degraded: false };
  }

  const t = shareTranslator(locale);
  const { card } = target;
  const media = await renderMedia(card.media);
  const authored = Boolean(card.quote || card.byline);
  const extra = authored ? (
    <AuthorNote quote={card.quote ?? null} stars={card.stars ?? null} detailedScore={card.detailedScore ?? null} byline={card.byline ?? null} />
  ) : card.community ? (
    <CommunityScore
      score={card.community}
      countLabel={t("share.image.communityAverage", { count: card.community.count })}
    />
  ) : (
    <ProfileCovers covers={media.covers} />
  );
  const element = (
    <LaminaFrame
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

/** PNG del formato Enlace (1200×630) de un objetivo, o la imagen genérica si es `null`. */
export async function renderShareImage(
  target: ShareTarget | null,
  locale: ShareLocale,
  options: RenderOptions = {},
): Promise<ImageResponse> {
  const [{ element, degraded }, fonts] = await Promise.all([buildElement(target, locale), loadShareFonts()]);
  const headers = { ...options.headers };
  if (degraded && options.degradedCacheControl) headers["Cache-Control"] = options.degradedCacheControl;
  return new ImageResponse(element as React.ReactElement, { ...LINK_FORMAT, fonts, headers });
}
