import { getFormatter } from "next-intl/server";

/**
 * Fecha relativa ("hace 2 días") para los listados de feed renderizados en el
 * servidor —los bloques compactos de Inicio (`CommunityActivity`,
 * `PublicLists`)—. Mantiene una sola convención de fecha en la página: el feed
 * completo y sus previews usan relativo (`FeedActivityList` vía
 * `useFormatter()` + `useNow()`); acá el `now` global de `getRequestConfig`
 * alcanza. El ISO absoluto va siempre en el `dateTime` del `<time>`.
 */
export async function relativeFeedDate(iso: string): Promise<string> {
  const format = await getFormatter();
  return format.relativeTime(new Date(iso));
}
