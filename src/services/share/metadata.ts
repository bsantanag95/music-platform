import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/share/app-url";
import type { ShareLocale, ShareTargetKind } from "@/lib/share/kinds";
import { shareAppName } from "./i18n";
import { LINK_FORMAT } from "./frame/LaminaFrame";
import { loadShareTarget, shareTargetVersion } from "./targets";
import { loadProfileTargetByUsername } from "./targets/profile";
import type { ShareTarget } from "./types";

// Metadatos Open Graph y Twitter/X de las páginas de destino (spec share-metadata; design D3). Se calculan con
// el mismo objetivo que la imagen (como anónimo), así que la URL anunciada lleva la versión que la ruta de
// imágenes reconoce como vigente. `og:url` nunca lleva query (`via` incluido). No se fija `alternates`: las
// pestañas heredan estos metadatos del layout del objeto y el layout raíz declara los idiomas.

const OG_LOCALES: Record<ShareLocale, string> = { es: "es_ES", en: "en_US" };

/** URL relativa de la imagen de un objetivo; sin objetivo, la de la imagen genérica (sin versión). */
export function shareImagePath(kind: ShareTargetKind, ref: string, locale: ShareLocale, target: ShareTarget | null, download = false): string {
  const params = new URLSearchParams({ locale, format: "link" });
  if (target) params.set("v", shareTargetVersion(target));
  if (download) params.set("download", "1");
  return `/api/share/image/${kind}/${encodeURIComponent(ref)}?${params.toString()}`;
}

/** Metadatos de compartir de un objetivo ya cargado. */
export function shareMetadataFor(target: ShareTarget): Metadata {
  const image = {
    url: absoluteUrl(shareImagePath(target.kind, target.ref, target.locale, target)),
    width: LINK_FORMAT.width,
    height: LINK_FORMAT.height,
    alt: target.imageAlt,
    type: "image/png",
  };
  const url = absoluteUrl(target.canonicalPath);
  return {
    description: target.description,
    openGraph: {
      type: target.kind === "profile" ? "profile" : "website",
      siteName: shareAppName(target.locale),
      title: target.title,
      description: target.description,
      url,
      locale: OG_LOCALES[target.locale],
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: target.title,
      description: target.description,
      images: [{ url: image.url, alt: image.alt }],
    },
  };
}

/** Metadatos sin objeto visible: imagen genérica y nada que lo nombre. */
export function genericShareMetadata(kind: ShareTargetKind, ref: string, locale: ShareLocale): Metadata {
  const url = absoluteUrl(shareImagePath(kind, ref, locale, null));
  return {
    openGraph: { siteName: shareAppName(locale), locale: OG_LOCALES[locale], images: [{ url, width: LINK_FORMAT.width, height: LINK_FORMAT.height }] },
    twitter: { card: "summary_large_image", images: [url] },
  };
}

/** Carga el objetivo como anónimo y arma sus metadatos (o los genéricos). */
export async function buildShareMetadata(kind: ShareTargetKind, ref: string, locale: string): Promise<Metadata> {
  const shareLocale: ShareLocale = locale === "en" ? "en" : "es";
  const target = await loadShareTarget(kind, ref, shareLocale);
  return target ? shareMetadataFor(target) : genericShareMetadata(kind, ref, shareLocale);
}

/**
 * Metadatos del perfil a partir del usuario de la ruta. La imagen se pide por el id de la cuenta (spec
 * share-events: referencia estable); sin cuenta visible, metadatos genéricos sin nombrarla.
 */
export async function buildProfileShareMetadata(username: string, locale: string): Promise<Metadata> {
  const shareLocale: ShareLocale = locale === "en" ? "en" : "es";
  const target = await loadProfileTargetByUsername(username, shareLocale);
  return target ? shareMetadataFor(target) : genericShareMetadata("profile", "-", shareLocale);
}

/** Datos de la hoja de compartir de un objetivo (los mismos de sus metadatos). */
export function sharePayloadFor(target: ShareTarget) {
  return {
    kind: target.kind,
    ref: target.ref,
    url: absoluteUrl(target.canonicalPath),
    title: target.title,
    imageUrl: shareImagePath(target.kind, target.ref, target.locale, target),
    imageAlt: target.imageAlt,
    downloadName: target.downloadName,
  };
}
