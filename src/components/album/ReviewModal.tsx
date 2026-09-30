"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Dialog } from "@/components/ui/Dialog";

// Modal de una reseña abierto desde el índice del álbum (openspec: redesign-album-page).
// La URL ya es `/review/{slug-id}` (ruta interceptada): cerrar vuelve atrás, al álbum con su
// pestaña y scroll; anterior/siguiente reemplazan la entrada del historial para que
// "cerrar" siga volviendo al álbum; "página completa" es una navegación dura, que no se
// intercepta. Los enlaces de vecinos llegan ya canonicalizados por el read-model
// (openspec: add-catalog-slugs).

interface ReviewModalProps {
  title: string;
  /** Href canónico (con locale) de la página completa. */
  fullPageHref: string;
  /** Href canónico (sin locale) de la reseña anterior, con su query de orden. */
  previousHref: string | null;
  /** Href canónico (sin locale) de la reseña siguiente, con su query de orden. */
  nextHref: string | null;
  children: ReactNode;
}

export function ReviewModal({ title, fullPageHref, previousHref, nextHref, children }: ReviewModalProps) {
  const t = useTranslations("catalog.album.reviewModal");
  const router = useRouter();

  return (
    <Dialog open title={title} size="lg" onClose={() => router.back()}>
      {children}
      <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-border pt-3 font-data text-xs">
        <span className="flex gap-4">
          {previousHref && (
            <Link href={previousHref} replace scroll={false} className="text-amber hover:underline">
              ◀ {t("previous")}
            </Link>
          )}
          {nextHref && (
            <Link href={nextHref} replace scroll={false} className="text-amber hover:underline">
              {t("next")} ▶
            </Link>
          )}
        </span>
        <span className="flex gap-4">
          <a href={fullPageHref} className="text-amber hover:underline">
            {t("fullPage")}
          </a>
          <button type="button" onClick={() => router.back()} className="text-paper-muted hover:text-paper">
            {t("close")}
          </button>
        </span>
      </nav>
    </Dialog>
  );
}
