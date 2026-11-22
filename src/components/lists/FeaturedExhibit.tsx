import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import type { DiscoverListSummary, UserListItem } from "@/lib/api/schemas";
import { presentList } from "@/lib/list-presentation";
import { SaveListButton } from "./SaveListButton";
import { entityTypeKey } from "./lists-shared";

/** Elementos que muestra el exhibidor (tres en el teléfono). */
export const EXHIBIT_ITEMS = 4;

/** Giro y desplazamiento de cada funda del abanico, de atrás hacia adelante. */
const FAN = [
  "left-0 -rotate-[9deg]",
  "left-[17%] -rotate-3",
  "left-[34%] rotate-3",
  "left-[51%] rotate-[9deg]",
] as const;

/** El abanico chico (variante compacta): tres fundas. */
const FAN_COMPACT = ["left-0 -rotate-6", "left-[21%]", "left-[42%] rotate-6"] as const;

/** Fundas abiertas en abanico (decorativas): las carátulas de la lista; en una lista de artistas, en círculo. */
function SleeveFan({ covers, round, compact }: { covers: string[]; round: boolean; compact: boolean }) {
  const shown = covers.slice(0, compact ? 3 : 4);
  const shape = round ? "rounded-full" : "rounded";
  const size = compact ? "w-[58%]" : "w-[49%]";
  return (
    <div aria-hidden="true" className={`relative mx-auto aspect-[2/1] w-full ${compact ? "max-w-[10rem]" : "max-w-[25rem]"}`}>
      {shown.length === 0 ? (
        <DiscPlaceholder alt="" className={`absolute bottom-0 left-1/4 aspect-square w-1/2 ${shape}`} />
      ) : (
        shown.map((cover, index) => (
          <span
            key={`${cover}-${index}`}
            className={`absolute bottom-0 aspect-square ${size} ${compact ? FAN_COMPACT[index] : FAN[index]} shadow-[0_24px_40px_-18px_rgba(0,0,0,0.9)]`}
          >
            <CoverThumb cover={cover} label="" className={`size-full ring-1 ring-ink ${shape}`} />
          </span>
        ))
      )}
    </div>
  );
}

/**
 * Exhibidor de "Destacadas" en `/lists` (openspec: redesign-lists-phase3, préstamo de la propuesta A): la primera destacada a
 * todo el ancho, con sus carátulas como fundas en abanico, la insignia oficial, el título en grande, la descripción, los primeros
 * elementos (resueltos en el servidor; sin ellos se muestra igual) y las acciones. `compact` es la variante de la segunda
 * destacada en adelante: abanico chico, título, tipo y conteo, todo como un enlace.
 */
export async function FeaturedExhibit({
  list,
  items = null,
  canSave,
  compact = false,
}: {
  list: DiscoverListSummary;
  /** Primeros elementos de la lista; `null` si no se pudieron obtener. */
  items?: UserListItem[] | null;
  canSave: boolean;
  compact?: boolean;
}) {
  const [t, locale] = await Promise.all([getTranslations("lists"), getLocale()]);
  const shown = presentList(list, locale);
  const round = list.entityType === "artist";
  const type = t(entityTypeKey(list.entityType));
  const counts = [
    t("itemsCount", { count: list.itemCount }),
    list.saveCount ? t("savesCount", { count: list.saveCount }) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const badge = list.isOfficial ? (
    <span className="inline-flex items-center gap-1 rounded border border-petrol-hover/50 px-1.5 py-px font-data text-xs text-petrol-hover">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true" className="size-3">
        <path d="M5 12.5 10 17.5 19 7" />
      </svg>
      {t("officialBadge")}
    </span>
  ) : null;

  if (compact) {
    return (
      <Link
        href={shown.href}
        className="group flex h-full items-center gap-5 rounded-xl border border-ink-border bg-ink-surface p-4 transition-colors hover:border-amber/70"
      >
        <div className="w-28 shrink-0">
          <SleeveFan covers={list.coverThumbs} round={round} compact />
        </div>
        <span className="flex min-w-0 flex-col gap-1">
          {badge ? <span>{badge}</span> : null}
          <span className="line-clamp-2 font-display text-lg leading-tight text-paper transition-colors group-hover:text-amber">
            {shown.title}
          </span>
          <span className="font-data text-xs text-paper-muted">
            {type} · {t("itemsCount", { count: list.itemCount })}
          </span>
        </span>
      </Link>
    );
  }

  const top = items?.slice(0, EXHIBIT_ITEMS) ?? [];
  return (
    <article className="relative grid w-full items-center gap-8 overflow-hidden rounded-2xl border border-ink-border bg-ink-surface bg-[radial-gradient(120%_140%_at_0%_100%,rgba(232,184,75,0.09),transparent_55%)] px-5 py-7 sm:px-8 sm:py-9 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10 lg:px-10">
      <SleeveFan covers={list.coverThumbs} round={round} compact={false} />
      <div className="flex min-w-0 flex-col items-start gap-3">
        <span className="flex flex-wrap items-center gap-2">
          {badge}
          <span className="font-data text-xs text-paper-muted">{type}</span>
        </span>
        <h3 className="text-balance font-display text-[clamp(1.875rem,3.2vw,2.875rem)] font-bold leading-none tracking-[-0.03em] text-paper">
          <Link href={shown.href} className="transition-colors hover:text-amber">
            {shown.title}
          </Link>
        </h3>
        {list.description ? <p className="line-clamp-2 max-w-[48ch] font-body text-paper-muted">{list.description}</p> : null}
        {top.length > 0 ? (
          <ol className="mt-1 flex w-full flex-col">
            {top.map((item, index) => (
              <li
                key={item.id}
                className={`grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-baseline gap-2.5 border-t border-ink-border py-2 ${
                  index === EXHIBIT_ITEMS - 1 ? "max-sm:hidden" : ""
                }`}
              >
                <span className="font-data text-xs tabular-nums text-paper-muted">{index + 1}</span>
                <span className="truncate font-display font-medium text-paper">{item.target.title}</span>
                {item.target.artistName ? (
                  <span className="max-w-[12rem] truncate text-right font-body text-sm text-paper-muted">{item.target.artistName}</span>
                ) : (
                  <span />
                )}
              </li>
            ))}
          </ol>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Link
            href={shown.href}
            className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-md bg-amber px-4 font-display text-sm font-medium text-ink transition-colors hover:bg-amber-hover"
          >
            {t("community.reader.open")}
          </Link>
          {canSave && !list.isOwn ? (
            <SaveListButton
              key={`${list.id}:${list.saved}:${list.following}`}
              listId={list.id}
              initialSaved={list.saved}
              initialFollowing={list.following}
              variant="full"
            />
          ) : null}
          <span className="font-data text-xs text-paper-muted">{counts}</span>
        </div>
      </div>
    </article>
  );
}
