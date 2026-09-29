"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { ListsContainingItemPanel } from "@/components/lists/ListsContainingItemPanel";
import { AlbumQuickActions } from "./AlbumQuickActions";
import { CoverThumb } from "./CoverThumb";
import { LazyCoverImage } from "./LazyCoverImage";
import { addWantedEntries } from "@/lib/api/wanted";
import type { ReleaseGroup } from "@/lib/api/schemas";

interface AlbumCardProps {
  releaseGroup: ReleaseGroup;
  categoryLabel: string;
  coverLabel: string;
  /** Hay sesión: el menú de acciones pide las marcas del disco y habilita Guardar/Seguir en "Ver en listas". */
  authenticated?: boolean;
}

// Tarjeta de álbum de Explorar. Usa `Link` de next-intl para preservar el locale activo. El
// menú "…" de acciones del disco (openspec: extend-album-quick-actions) va en la esquina de la
// portada, fuera del `Link` (no anidado dentro de él); reemplaza al menú "···" anterior y
// conserva lo que solo tenía ese menú: "Ver en listas" y las acciones de colección (el spec
// `collection-wishlist` exige "Lo busco" en el menú de la ficha de álbum).
export function AlbumCard({ releaseGroup, categoryLabel, coverLabel, authenticated = false }: AlbumCardProps) {
  const t = useTranslations("lists");
  const tCollection = useTranslations("collection");
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showingInLists, setShowingInLists] = useState(false);
  const [wantedBusy, setWantedBusy] = useState(false);
  const [status, setStatus] = useState<"wantedAdded" | "wantedError" | null>(null);

  const target = { type: "release-group" as const, id: releaseGroup.id };

  // Alta rápida a la wishlist: una sola variante sin formato ni atributos, sin abrir ningún
  // formulario (openspec: add-collection-wishlist). Cierra el menú para que se vea el resultado.
  const handleWantIt = async () => {
    setMenuOpen(false);
    if (!authenticated) {
      router.push("/auth/login");
      return;
    }
    if (wantedBusy) return;
    setWantedBusy(true);
    try {
      await addWantedEntries({ releaseGroupId: releaseGroup.id, entries: [{}] });
      setStatus("wantedAdded");
    } catch {
      setStatus("wantedError");
    } finally {
      setWantedBusy(false);
    }
  };

  // Lleva al flujo de "Ya la tengo" en la página de álbum, ya abierto.
  const handleHaveIt = () => {
    setMenuOpen(false);
    router.push(authenticated ? `/album/${releaseGroup.id}?collection=have` : "/auth/login");
  };

  const extraButton = "font-data text-xs text-amber underline-offset-2 hover:underline disabled:opacity-50";

  return (
    <div className="group/card relative flex w-full flex-col gap-2 rounded-lg border border-ink-border bg-ink-surface p-3 transition-colors hover:border-amber">
      <Link href={`/album/${releaseGroup.id}`} className="flex flex-col gap-2">
        {releaseGroup.coverResolved ? (
          // Resuelta (URL conocida, ausencia confirmada o retirada): se
          // renderiza en la carga inicial, sin request por carátula.
          <CoverThumb
            cover={releaseGroup.coverThumbUrl}
            label={coverLabel}
            className="aspect-square w-full"
          />
        ) : (
          <LazyCoverImage
            releaseGroupId={releaseGroup.id}
            coverLabel={coverLabel}
            className="aspect-square w-full"
          />
        )}
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm text-paper">{releaseGroup.title}</h3>
          <p className="font-data text-xs text-paper-muted">
            {releaseGroup.firstReleaseYear !== null
              ? `${releaseGroup.firstReleaseYear} · ${categoryLabel}`
              : categoryLabel}
          </p>
        </div>
      </Link>
      <AlbumQuickActions
        item={releaseGroup}
        authenticated={authenticated}
        open={menuOpen}
        onOpenChange={setMenuOpen}
        variant="cover"
        className={`!absolute right-4 top-4 ${
          menuOpen
            ? "opacity-100"
            : "opacity-0 focus-within:opacity-100 group-hover/card:opacity-100 [@media(hover:none)]:opacity-100"
        }`}
        extraActions={
          <>
            <button
              type="button"
              className={extraButton}
              onClick={() => {
                setMenuOpen(false);
                setShowingInLists((current) => !current);
              }}
            >
              {t("showInLists")}
            </button>
            <button type="button" className={extraButton} disabled={wantedBusy} onClick={() => void handleWantIt()}>
              {tCollection("menuWantIt")}
            </button>
            <button type="button" className={extraButton} onClick={handleHaveIt}>
              {tCollection("menuHaveIt")}
            </button>
          </>
        }
      />
      {showingInLists && (
        <ListsContainingItemPanel
          target={target}
          canSave={authenticated}
          onClose={() => setShowingInLists(false)}
        />
      )}
      {status && (
        <span role="status" aria-live="polite" className="font-data text-xs text-paper-muted">
          {status === "wantedAdded" ? tCollection("quickWantedAdded") : tCollection("saveError")}
        </span>
      )}
    </div>
  );
}
