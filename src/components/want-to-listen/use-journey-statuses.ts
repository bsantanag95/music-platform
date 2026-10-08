"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getArtistJourneyStatuses } from "@/lib/api/artist-journeys";
import type { WantToListenEntry } from "@/lib/api/schemas";

/** Estado del recorrido de un artista; `loading` mientras no llega la respuesta del lote. */
export type JourneyStatus = "loading" | "none" | "added" | "error";

// Tope de la API por consulta (`GET /api/me/artist-journeys?artistIds=`).
const BATCH_SIZE = 100;

// Estado de recorrido de los artistas de Quiero escuchar, pedido por lote (openspec:
// batch-artist-journey-status). Antes cada tarjeta pedía el detalle de su artista al montarse
// (N peticiones que, en desarrollo, StrictMode duplica y que ocupaban las 6 conexiones del
// navegador); ahora es una petición por lote de artistas nuevos — la primera página y cada
// "Cargar más". Un artista ya pedido no se vuelve a pedir.
export function useJourneyStatuses(entries: WantToListenEntry[]) {
  const [statuses, setStatuses] = useState<ReadonlyMap<string, JourneyStatus>>(new Map());
  const requested = useRef(new Set<string>());

  useEffect(() => {
    const missing = entries
      .filter((entry) => entry.targetType === "artist")
      .map((entry) => entry.target.id)
      .filter((id) => !requested.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => requested.current.add(id));

    for (let start = 0; start < missing.length; start += BATCH_SIZE) {
      const batch = missing.slice(start, start + BATCH_SIZE);
      const resolve = (withJourney: Set<string> | null) =>
        setStatuses((current) => {
          const next = new Map(current);
          for (const id of batch) next.set(id, withJourney === null ? "error" : withJourney.has(id) ? "added" : "none");
          return next;
        });
      getArtistJourneyStatuses(batch)
        .then((ids) => resolve(new Set(ids)))
        .catch(() => resolve(null));
    }
  }, [entries]);

  const statusOf = useCallback((artistId: string): JourneyStatus => statuses.get(artistId) ?? "loading", [statuses]);

  const markAdded = useCallback((artistId: string) => {
    setStatuses((current) => new Map(current).set(artistId, "added"));
  }, []);

  const markError = useCallback((artistId: string) => {
    setStatuses((current) => new Map(current).set(artistId, "error"));
  }, []);

  return { statusOf, markAdded, markError };
}
