"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Dialog } from "@/components/ui/Dialog";

// Modal de una reseña abierto desde el índice del álbum (openspec: redesign-album-page).
// La URL ya es `/review/{id}` (ruta interceptada): cerrar vuelve atrás, al álbum con su
// pestaña y scroll; anterior/siguiente reemplazan la entrada del historial para que
// "cerrar" siga volviendo al álbum; "página completa" es una navegación dura, que no se
// intercepta.

interface ReviewModalProps {
  title: string;
  previousId: string | null;
  nextId: string | null;
  /** Query del orden activo (`?sort=best`) para mantenerlo al navegar. */
  sortQuery: string;
  reviewId: string;
  children: ReactNode;
}

export function ReviewModal({ title, previousId, nextId, sortQuery, reviewId, children }: ReviewModalProps) {
  const t = useTranslations("catalog.album.reviewModal");
  const locale = useLocale();
  const router = useRouter();

  return (
    <Dialog open title={title} size="lg" onClose={() => router.back()}>
      {children}
      <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-border pt-3 font-data text-xs">
        <span className="flex gap-4">
          {previousId && (
            <Link href={`/review/${previousId}${sortQuery}`} replace scroll={false} className="text-amber hover:underline">
              ◀ {t("previous")}
            </Link>
          )}
          {nextId && (
            <Link href={`/review/${nextId}${sortQuery}`} replace scroll={false} className="text-amber hover:underline">
              {t("next")} ▶
            </Link>
          )}
        </span>
        <span className="flex gap-4">
          <a href={`/${locale}/review/${reviewId}`} className="text-amber hover:underline">
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
