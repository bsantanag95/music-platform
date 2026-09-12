"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { getListsContainingItem } from "@/lib/api/lists";
import { ApiError } from "@/lib/api/client";
import type { DiscoverListSummary, ListTarget } from "@/lib/api/schemas";
import { CommunityListCard } from "./CommunityListCard";
import { itemListsHref } from "./lists-shared";

// Tope del panel acotado — con cientos de listas en la plataforma, este panel
// inline no puede ser el lugar para navegarlas todas. "Ver más" lleva siempre
// (no solo cuando se corta en 4) a la página dedicada y paginada, como acceso
// permanente a "ver esto en su contexto completo" (openspec:
// show-item-in-lists, ficha "limit panel to 4 + dedicated page").
const PANEL_SIZE = 4;

interface ListsContainingItemPanelProps {
  target: ListTarget;
  /** Hay sesión: habilita Guardar/Seguir en cada tarjeta. */
  canSave: boolean;
  onClose?: () => void;
}

// Panel "Mostrar en listas": hasta 4 listas públicas más populares (de
// cualquier usuario) que contienen este artista/álbum/canción, con el mismo
// look que /lists (`CommunityListCard`). Se abre desde el menú "···" de una
// fila del diario, del tracklist de un álbum, de una tarjeta de la
// discografía, o desde un botón de catálogo — a diferencia de
// `AddToListPanel`, no requiere sesión para consultarse porque solo muestra
// información pública (openspec: show-item-in-lists).
export function ListsContainingItemPanel({ target, canSave, onClose }: ListsContainingItemPanelProps) {
  const t = useTranslations("lists");
  const [lists, setLists] = useState<DiscoverListSummary[] | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLists(null);
    setErrorCode(null);
    getListsContainingItem(target, 1, PANEL_SIZE, "popular")
      .then((result) => {
        if (cancelled) return;
        setLists(result.lists);
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorCode(err instanceof ApiError ? err.code : "INTERNAL_ERROR");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.type, target.id]);

  return (
    <div className="flex w-full max-w-md flex-col gap-2 rounded border border-ink-border bg-ink-surface p-3">
      {lists === null ? (
        <p className="font-body text-sm text-paper-muted">{t("loadingMore")}</p>
      ) : lists.length === 0 ? (
        <div className="flex flex-col gap-1">
          <p className="font-body text-sm text-paper">{t("containingEmptyTitle")}</p>
          <p className="font-body text-sm text-paper-muted">{t("containingEmptyDescription")}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {lists.map((list) => (
            <li key={list.id}>
              <CommunityListCard list={list} canSave={canSave} dense />
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-3">
        {lists && lists.length > 0 && (
          <Link
            href={itemListsHref(target)}
            className="font-data text-xs text-amber underline decoration-dotted underline-offset-2 transition-colors hover:text-paper"
          >
            {t("seeAllLists")}
          </Link>
        )}
        {onClose ? (
          <Button variant="ghost" onClick={onClose}>
            {t("collapse")}
          </Button>
        ) : null}
      </div>
      {errorCode && (
        <span role="alert" className="font-data text-xs text-danger">
          {t("loadError")}
        </span>
      )}
    </div>
  );
}
