"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { activateArtistJourney } from "@/lib/api/artist-journeys";
import type { JourneyStatus } from "./use-journey-statuses";

interface WantToListenArtistJourneyActionProps {
  artistId: string;
  /** Estado resuelto por lote en `WantToListenList` (`useJourneyStatuses`). */
  status: JourneyStatus;
  onAdded: (artistId: string) => void;
  onError: (artistId: string) => void;
}

// Acción rápida "Agregar al Recorrido" para las entradas de artista de Quiero
// Escuchar (openspec: add-artist-journey): si el artista no tiene recorrido, ofrece activarlo
// con un clic — sin el modal de selección inicial de álbumes de `ArtistJourneySection`, que
// solo aplica en la página del artista. Si ya existe, enlaza a su gestión. El estado llega de
// la lista (una petición por lote, openspec: batch-artist-journey-status): este componente ya
// no consulta por su cuenta.
export function WantToListenArtistJourneyAction({
  artistId,
  status,
  onAdded,
  onError,
}: WantToListenArtistJourneyActionProps) {
  const t = useTranslations("wantToListen");
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    setBusy(true);
    try {
      await activateArtistJourney(artistId);
      onAdded(artistId);
    } catch {
      onError(artistId);
    } finally {
      setBusy(false);
    }
  };

  if (status === "loading" || status === "error") return null;

  if (status === "added") {
    return (
      <Link
        href={`/me/artist-journeys/${artistId}`}
        className="shrink-0 font-data text-xs text-paper-muted underline decoration-dotted transition-colors hover:text-amber"
      >
        {t("journeyAlreadyAdded")}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void handleAdd()}
      className="shrink-0 font-data text-xs text-paper-muted underline decoration-dotted transition-colors hover:text-amber disabled:opacity-50"
    >
      {busy ? t("journeyAdding") : t("journeyAdd")}
    </button>
  );
}
