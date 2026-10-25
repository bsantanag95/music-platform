import type { NotificationTab } from "@/db/schema";
import type { NotificationGroup } from "./read";
import { listNotificationGroups } from "./read";

// Resumen semanal por email (openspec: add-notification-digest-and-awards, D3).
//
// Reutiliza la lectura de la bandeja (`listNotificationGroups`) en vez de
// escribir una consulta propia: los filtros de privacidad, la agrupación y los
// textos son exactamente los que la persona ya ve en la app. Solo se queda con
// lo no leído cuyo evento más reciente cae dentro de la ventana.

/** Entradas por sección que caben en el correo. */
export const DIGEST_SECTION_LIMIT = 8;

/** Tamaño de página con el que se recorre la bandeja (no se muestra al usuario). */
const DIGEST_PAGE_SIZE = 50;

export interface DigestSection {
  tab: NotificationTab;
  /** Entradas de la ventana, como mucho `DIGEST_SECTION_LIMIT`. */
  entries: NotificationGroup[];
  /** Entradas de la ventana que no caben en la sección ("y N más"). */
  more: number;
  /** Entradas de la ventana en total (las mostradas incluidas). */
  total: number;
}

export interface NotificationDigest {
  forYou: DigestSection;
  releases: DigestSection;
  /** Entradas de la ventana sumando las dos secciones. */
  total: number;
}

export interface BuildDigestOptions {
  /** Zona IANA de la persona: los seguidores se agrupan por día local. */
  timeZone?: string | null;
}

/**
 * Arma el resumen de la ventana `(windowStart, windowEnd]`. Una semana sin
 * entradas sin leer da `total: 0` y no se envía (la marca no avanza y la
 * ventana siguiente cubre lo pendiente).
 */
export async function buildDigest(
  userId: string,
  windowStart: Date,
  windowEnd: Date,
  options: BuildDigestOptions = {},
): Promise<NotificationDigest> {
  const [forYou, releases] = await Promise.all([
    sectionFor(userId, "for_you", windowStart, windowEnd, options),
    sectionFor(userId, "releases", windowStart, windowEnd, options),
  ]);

  return { forYou, releases, total: forYou.total + releases.total };
}

async function sectionFor(
  userId: string,
  tab: NotificationTab,
  windowStart: Date,
  windowEnd: Date,
  options: BuildDigestOptions,
): Promise<DigestSection> {
  const collected: NotificationGroup[] = [];
  let cursor: string | null = null;

  // La bandeja viene de la más reciente a la más antigua: al llegar a una
  // entrada anterior a la ventana, todo lo que sigue también lo es.
  do {
    const page = await listNotificationGroups(userId, {
      tab,
      cursor,
      pageSize: DIGEST_PAGE_SIZE,
      timeZone: options.timeZone,
    });

    let reachedWindowStart = false;
    for (const group of page.groups) {
      const lastAt = Date.parse(group.lastAt);
      if (lastAt <= windowStart.getTime()) {
        reachedWindowStart = true;
        break;
      }
      if (!group.unread || lastAt > windowEnd.getTime()) continue;
      collected.push(group);
    }

    cursor = reachedWindowStart ? null : page.nextCursor;
  } while (cursor);

  return {
    tab,
    entries: collected.slice(0, DIGEST_SECTION_LIMIT),
    more: Math.max(0, collected.length - DIGEST_SECTION_LIMIT),
    total: collected.length,
  };
}
