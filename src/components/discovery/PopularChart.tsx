import { Link } from "@/i18n/navigation";
import { AppImage } from "@/components/ui/AppImage";
import { CoverThumb } from "@/components/catalog/CoverThumb";

export interface PopularChartItem {
  id: string;
  href: string;
  title: string;
  /** Línea bajo el título (el artista de un disco o de una canción). */
  subtitle?: string | null;
  /** Dato extra apagado ("2024 · De estudio"). */
  meta?: string | null;
  /** Foto del artista (redonda) o carátula (cuadrada). */
  image: { src: string | null; shape: "round" | "square" };
  /** "12 personas", solo desde el umbral; sin cifra por debajo. */
  figure?: string;
}

function Picture({ item, className, sizes }: { item: PopularChartItem; className: string; sizes: string }) {
  if (item.image.shape === "square") {
    return <CoverThumb cover={item.image.src} label="" className={`${className} rounded-md`} />;
  }
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-surface font-display text-paper-muted ring-1 ring-ink-border ${className}`}
    >
      {item.image.src ? (
        <AppImage src={item.image.src} alt="" fill sizes={sizes} className="object-cover" />
      ) : (
        <span aria-hidden="true">{item.title.trim().charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}

/**
 * Ranking de "Popular ahora" con la forma de un chart (como los de Spotify, Apple Music o Last.fm): el n.º 1 como pieza
 * grande, con su imagen difuminada de fondo, y el resto numerado al lado en dos columnas. La misma forma para álbumes,
 * artistas y canciones: antes los álbumes eran un riel sin posiciones y artistas y canciones una lista, y la sección se
 * leía como tres cosas distintas en lugar de un ranking. Todo es un enlace; la imagen es decorativa.
 */
export function PopularChart({ items, label }: { items: PopularChartItem[]; label: string }) {
  const [top, ...rest] = items;
  if (!top) return null;

  return (
    <div className="grid w-full gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <Link
        href={top.href}
        className="group relative isolate flex items-center gap-5 overflow-hidden rounded-xl border border-ink-border bg-ink-surface p-5 transition-colors hover:border-amber focus-visible:border-amber"
      >
        {top.image.src ? (
          <span aria-hidden="true" className="absolute inset-0 -z-10">
            <AppImage src={top.image.src} alt="" fill sizes="640px" className="scale-125 object-cover opacity-30 blur-3xl saturate-150" />
            <span className="absolute inset-0 bg-gradient-to-r from-ink/40 via-ink/80 to-ink" />
          </span>
        ) : null}
        <Picture item={top} className="size-28 shrink-0 sm:size-36" sizes="144px" />
        <span className="flex min-w-0 flex-col gap-1">
          <span className="font-display text-5xl leading-none text-amber tabular-nums">1</span>
          <span className="line-clamp-2 font-display text-xl text-paper transition-colors group-hover:text-amber sm:text-2xl">
            {top.title}
          </span>
          {top.subtitle ? <span className="truncate font-body text-sm text-paper-muted">{top.subtitle}</span> : null}
          {top.meta ? <span className="truncate font-data text-xs text-paper-muted">{top.meta}</span> : null}
          {top.figure ? <span className="mt-1 font-data text-xs tabular-nums text-paper">{top.figure}</span> : null}
        </span>
      </Link>

      {rest.length > 0 ? (
        <ol start={2} aria-label={label} className="grid content-start gap-x-4 gap-y-1 sm:grid-cols-2">
          {rest.map((item, index) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-ink-surface focus-visible:bg-ink-surface"
              >
                <span className="w-6 shrink-0 text-right font-display text-lg tabular-nums text-paper-muted transition-colors group-hover:text-paper">
                  {index + 2}
                </span>
                <Picture item={item} className="size-12 shrink-0" sizes="48px" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
                    {item.title}
                  </span>
                  {item.subtitle ? <span className="truncate font-body text-xs text-paper-muted">{item.subtitle}</span> : null}
                  {item.figure ? (
                    <span className="truncate font-data text-[0.7rem] tabular-nums text-paper-muted">{item.figure}</span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
