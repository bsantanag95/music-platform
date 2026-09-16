"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { activateArtistJourney, getArtistJourney } from "@/lib/api/artist-journeys";

type Status = "loading" | "none" | "added" | "error";

// Acción rápida "Agregar al Recorrido" para las entradas de artista de Quiero
// Escuchar: consulta si el artista ya tiene un recorrido (openspec:
// add-artist-journey) y, si no, ofrece activarlo con un clic — sin el modal
// de selección inicial de álbumes de `ArtistJourneySection`, que solo aplica
// en la página del artista. Si ya existe, enlaza a su gestión.
export function WantToListenArtistJourneyAction({ artistId }: { artistId: string }) {
  const t = useTranslations("wantToListen");
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getArtistJourney(artistId)
      .then((journey) => {
        if (!cancelled) setStatus(journey ? "added" : "none");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [artistId]);

  const handleAdd = async () => {
    setBusy(true);
    try {
      await activateArtistJourney(artistId);
      setStatus("added");
    } catch {
      setStatus("error");
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
