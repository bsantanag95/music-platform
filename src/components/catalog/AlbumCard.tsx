"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { RowMenu, RowMenuItem } from "@/components/ui/RowMenu";
import { ListsContainingItemPanel } from "@/components/lists/ListsContainingItemPanel";
import { AddToListPanel } from "@/components/lists/AddToListPanel";
import { LazyCoverImage } from "./LazyCoverImage";
import { addWantedEntries } from "@/lib/api/wanted";
import { toggleFavorite } from "@/lib/api/favorites";
import { toggleWantToListen } from "@/lib/api/want-to-listen";
import { createListenEntry } from "@/lib/api/diary";
import type { ReleaseGroup } from "@/lib/api/schemas";

interface AlbumCardProps {
  releaseGroup: ReleaseGroup;
  categoryLabel: string;
  coverLabel: string;
  /** Hay sesión: habilita Guardar/Seguir en "Mostrar en listas" y las demás acciones del menú "···". */
  authenticated?: boolean;
}

type QuickStatusKind =
  | "wantedAdded"
  | "wantedError"
  | "favoriteAdded"
  | "favoriteRemoved"
  | "favoriteError"
  | "wantToListenAdded"
  | "wantToListenRemoved"
  | "wantToListenError"
  | "listenRegistered"
  | "listenError";

// Tarjeta de álbum dentro de la discografía. Usa `Link` de next-intl para
// preservar el locale activo al navegar al detalle del álbum. El menú "···"
// (openspec: show-item-in-lists) va superpuesto en la esquina de la portada,
// fuera del `Link` (no anidado dentro de él) para no pelear con su navegación
// — mismo motivo por el que `ListsContainingItemPanel` se abre debajo de la
// tarjeta y no dentro del enlace.
export function AlbumCard({ releaseGroup, categoryLabel, coverLabel, authenticated = false }: AlbumCardProps) {
  const t = useTranslations("lists");
  const tCollection = useTranslations("collection");
  const tFavorites = useTranslations("favorites");
  const tWantToListen = useTranslations("wantToListen");
  const tDiary = useTranslations("diary");
  const router = useRouter();
  const [showingInLists, setShowingInLists] = useState(false);
  const [addingToList, setAddingToList] = useState(false);
  const [quickBusy, setQuickBusy] = useState(false);
  const [status, setStatus] = useState<QuickStatusKind | null>(null);

  const target = { type: "release-group" as const, id: releaseGroup.id };

  // Todas las acciones rápidas del menú "···" comparten un único flag de
  // ocupado (evita disparar dos a la vez) y un único mensaje de resultado,
  // mostrado debajo de la tarjeta — ninguna abre un panel propio salvo
  // "Agregar a lista"/"Mostrar en listas".
  const runQuickAction = async (action: () => Promise<QuickStatusKind>, errorKind: QuickStatusKind) => {
    if (!authenticated) {
      router.push("/auth/login");
      return;
    }
    if (quickBusy) return;
    setQuickBusy(true);
    try {
      setStatus(await action());
    } catch {
      setStatus(errorKind);
    } finally {
      setQuickBusy(false);
    }
  };

  // Alta rápida a la wishlist desde el menú "···": una sola variante sin
  // formato ni atributos, sin abrir ningún formulario (openspec:
  // add-collection-wishlist).
  const handleWantIt = () =>
    runQuickAction(async () => {
      await addWantedEntries({ releaseGroupId: releaseGroup.id, entries: [{}] });
      return "wantedAdded";
    }, "wantedError");

  // Lleva al flujo de "La tengo" en la página de álbum, ya abierto.
  const handleHaveIt = () => {
    if (!authenticated) {
      router.push("/auth/login");
      return;
    }
    router.push(`/album/${releaseGroup.id}?collection=have`);
  };

  const handleToggleFavorite = () =>
    runQuickAction(async () => {
      const result = await toggleFavorite(target);
      return result !== null ? "favoriteAdded" : "favoriteRemoved";
    }, "favoriteError");

  const handleToggleWantToListen = () =>
    runQuickAction(async () => {
      const result = await toggleWantToListen(target);
      return result !== null ? "wantToListenAdded" : "wantToListenRemoved";
    }, "wantToListenError");

  const handleRegisterListen = () =>
    runQuickAction(async () => {
      await createListenEntry(target);
      return "listenRegistered";
    }, "listenError");

  const handleAddToList = () => {
    if (!authenticated) {
      router.push("/auth/login");
      return;
    }
    setAddingToList((current) => !current);
  };

  const statusMessage = (kind: QuickStatusKind): string => {
    switch (kind) {
      case "wantedAdded":
        return tCollection("quickWantedAdded");
      case "wantedError":
        return tCollection("saveError");
      case "favoriteAdded":
        return tFavorites("quickAdded");
      case "favoriteRemoved":
        return tFavorites("quickRemoved");
      case "favoriteError":
        return tFavorites("saveError");
      case "wantToListenAdded":
        return tWantToListen("quickAdded");
      case "wantToListenRemoved":
        return tWantToListen("quickRemoved");
      case "wantToListenError":
        return tWantToListen("saveError");
      case "listenRegistered":
        return tDiary("marked");
      case "listenError":
        return tDiary("saveError");
    }
  };

  return (
    <div className="group relative flex w-full flex-col gap-2 rounded-lg border border-ink-border bg-ink-surface p-3 transition-colors hover:border-amber">
      <Link href={`/album/${releaseGroup.id}`} className="flex flex-col gap-2">
        <LazyCoverImage
          releaseGroupId={releaseGroup.id}
          coverLabel={coverLabel}
          className="aspect-square w-full"
        />
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm text-paper">{releaseGroup.title}</h3>
          <p className="font-data text-xs text-paper-muted">
            {releaseGroup.firstReleaseYear !== null
              ? `${releaseGroup.firstReleaseYear} · ${categoryLabel}`
              : categoryLabel}
          </p>
        </div>
      </Link>
      <div className="absolute right-2 top-2 rounded-full bg-ink/80 backdrop-blur-sm">
        <RowMenu label={t("itemMenuLabel")}>
          <RowMenuItem onSelect={handleAddToList}>{t("addItem")}</RowMenuItem>
          <RowMenuItem onSelect={() => setShowingInLists((current) => !current)}>
            {t("showInLists")}
          </RowMenuItem>
          <RowMenuItem onSelect={() => void handleToggleFavorite()}>
            {tFavorites("addFavorite")}
          </RowMenuItem>
          <RowMenuItem onSelect={() => void handleToggleWantToListen()}>
            {tWantToListen("add")}
          </RowMenuItem>
          <RowMenuItem onSelect={() => void handleRegisterListen()}>
            {tDiary("registerListen")}
          </RowMenuItem>
          <RowMenuItem onSelect={() => void handleWantIt()}>{tCollection("menuWantIt")}</RowMenuItem>
          <RowMenuItem onSelect={handleHaveIt}>{tCollection("menuHaveIt")}</RowMenuItem>
        </RowMenu>
      </div>
      {showingInLists && (
        <ListsContainingItemPanel
          target={target}
          canSave={authenticated}
          onClose={() => setShowingInLists(false)}
        />
      )}
      {addingToList && <AddToListPanel target={target} onClose={() => setAddingToList(false)} />}
      {status && (
        <span role="status" aria-live="polite" className="font-data text-xs text-paper-muted">
          {statusMessage(status)}
        </span>
      )}
    </div>
  );
}
