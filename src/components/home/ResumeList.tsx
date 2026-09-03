import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import type { HomeResumeList } from "@/services/home/home";

// "Retomá una lista": acceso directo a la lista propia con actividad más
// reciente, para seguir agregándole ítems. No renderiza nada si el usuario no
// tiene listas (ver docs/05-features/home.md).
export async function ResumeList({ list }: { list: HomeResumeList | null }) {
  if (!list) return null;

  const t = await getTranslations("home");

  return (
    <section className="w-full max-w-3xl">
      <Link
        href={`/me/lists/${list.id}`}
        className="group flex items-center gap-4 rounded-lg border border-ink-border bg-ink-surface p-4 transition-colors hover:border-amber"
      >
        <ListMosaic covers={list.coverThumbUrls} title={list.title} />
        <span className="min-w-0 flex-1">
          <span className="block font-data text-xs uppercase tracking-wide text-paper-muted">
            {t("resumeListLabel")}
          </span>
          <span className="mt-0.5 block truncate font-display text-lg text-paper transition-colors group-hover:text-amber">
            {list.title}
          </span>
          <span className="font-data text-xs text-paper-muted">
            {t("resumeListItemCount", { count: list.itemCount })}
          </span>
        </span>
      </Link>
    </section>
  );
}

// Mosaico 2×2 de carátulas de los primeros ítems; si la lista no es de álbumes
// (o aún no tiene carátulas resueltas) cae en un único disco de fallback.
function ListMosaic({ covers, title }: { covers: string[]; title: string }) {
  if (covers.length === 0) {
    return <CoverThumb cover={null} label={title} className="size-16" />;
  }

  return (
    <span
      aria-hidden
      className="grid size-16 shrink-0 grid-cols-2 grid-rows-2 gap-px overflow-hidden rounded"
    >
      {[0, 1, 2, 3].map((i) => {
        const cover = covers[i % covers.length];
        return (
          <span key={i} className="relative bg-ink">
            {cover ? (
              <Image src={cover} alt="" fill sizes="32px" className="object-cover" />
            ) : null}
          </span>
        );
      })}
    </span>
  );
}
