import { Link } from "@/i18n/navigation";
import { AppImage } from "@/components/ui/AppImage";
import { CoverThumb } from "@/components/catalog/CoverThumb";

export interface PopularRankItem {
  id: string;
  href: string;
  title: string;
  /** Línea bajo el título (el artista de una canción). */
  subtitle?: string | null;
  /** Foto del artista (redonda) o carátula del disco de la canción (cuadrada). */
  image: { src: string | null; shape: "round" | "square" };
  /** "12 personas", solo desde el umbral; sin cifra por debajo. */
  figure?: string;
}

/**
 * Lista numerada compacta de "Popular ahora" (artistas y canciones): número, imagen, nombre y, si corresponde, la cifra de
 * personas. Dos columnas desde `md`, para que diez filas no alarguen la portada. Un artista sin foto lleva su inicial; una
 * canción sin carátula, el disco de siempre.
 */
export function PopularRankList({ items, label }: { items: PopularRankItem[]; label: string }) {
  if (items.length === 0) return null;
  return (
    <ol aria-label={label} className="grid w-full grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
      {items.map((item, index) => (
        <li key={item.id}>
          <Link
            href={item.href}
            className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-ink-surface focus-visible:bg-ink-surface"
          >
            <span className="w-6 shrink-0 text-right font-data text-sm tabular-nums text-paper-muted">{index + 1}</span>
            {item.image.shape === "round" ? (
              <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-surface font-display text-paper-muted ring-1 ring-ink-border">
                {item.image.src ? (
                  <AppImage src={item.image.src} alt="" fill sizes="44px" className="object-cover" />
                ) : (
                  <span aria-hidden="true">{item.title.trim().charAt(0).toUpperCase()}</span>
                )}
              </span>
            ) : (
              <CoverThumb cover={item.image.src} label="" className="size-11 rounded" />
            )}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-display text-sm text-paper transition-colors group-hover:text-amber">{item.title}</span>
              {item.subtitle ? <span className="truncate font-body text-xs text-paper-muted">{item.subtitle}</span> : null}
            </span>
            {item.figure ? <span className="shrink-0 font-data text-xs tabular-nums text-paper-muted">{item.figure}</span> : null}
          </Link>
        </li>
      ))}
    </ol>
  );
}
