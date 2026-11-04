import type { ShareChannel } from "./kinds";

// Canales de la hoja de compartir (spec share-sheet; design D11). Enlaces planos de publicación de cada red:
// sin SDK, píxeles ni scripts de terceros. Cada enlace compartido lleva `?via=<canal>` para medir de dónde
// llega la gente; la URL canónica de la página nunca lo incluye.

/** Canales con atajo propio en la hoja, en este orden. */
export const SHARE_INTENT_CHANNELS = ["x", "whatsapp", "threads", "bluesky", "facebook", "telegram", "reddit"] as const;
export type ShareIntentChannel = (typeof SHARE_INTENT_CHANNELS)[number];

/** URL canónica con el canal: reemplaza un `via` previo y conserva el resto. */
export function withVia(url: string, channel: ShareChannel): string {
  const parsed = new URL(url);
  parsed.searchParams.set("via", channel);
  return parsed.toString();
}

/** URL de publicación de una red con el título y el enlace (ya con `via`). */
export function intentUrl(channel: ShareIntentChannel, title: string, link: string): string {
  const t = encodeURIComponent(title);
  const u = encodeURIComponent(link);
  switch (channel) {
    case "x":
      return `https://x.com/intent/post?text=${t}&url=${u}`;
    case "whatsapp":
      return `https://wa.me/?text=${t}%20${u}`;
    case "threads":
      return `https://www.threads.net/intent/post?text=${t}%20${u}`;
    case "bluesky":
      return `https://bsky.app/intent/compose?text=${t}%20${u}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case "telegram":
      return `https://t.me/share/url?url=${u}&text=${t}`;
    case "reddit":
      return `https://www.reddit.com/submit?url=${u}&title=${t}`;
  }
}

/** URL de descarga de la imagen: la misma versión de la vista previa, como adjunto. */
export function downloadUrl(imageUrl: string): string {
  const base = imageUrl.startsWith("http") ? undefined : "http://placeholder.local";
  const parsed = new URL(imageUrl, base);
  parsed.searchParams.set("download", "1");
  return base ? `${parsed.pathname}${parsed.search}` : parsed.toString();
}
