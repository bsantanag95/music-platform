"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getMyLists, addItemToList } from "@/lib/api/lists";
import { getMyCaminos, addAlbumToCamino } from "@/lib/api/camino";
import { ApiError } from "@/lib/api/client";
import type { CaminoDetail, CaminoSummary, ListTarget, UserListDetail, UserListSummary } from "@/lib/api/schemas";
import { ListForm } from "./ListForm";
import { CaminoForm } from "@/components/camino/CaminoForm";

function isCompatible(list: UserListSummary, targetType: string): boolean {
  return list.entityType === targetType;
}

interface AddToListPanelProps {
  target: ListTarget;
  onClose?: () => void;
}

// Panel de "agregar a lista": ofrece las listas propias compatibles con el
// tipo del objetivo y permite crear una lista nueva, con el mismo formulario
// que "Listas -> Nueva lista". Extraído de `AddToListButton` (openspec:
// redesign-diary-row) para que tanto el botón de catálogo como el menú de una
// fila del diario compartan una sola fuente de esta lógica sin duplicar la
// llamada a la API. Se carga al montar — el caller decide cuándo mostrarlo.
//
// Para objetivos de álbum, agrega una segunda sección de Caminos propios
// (openspec: add-camino) — mismo mecanismo de alta que las Listas, sin un
// buscador de catálogo embebido (criterio ya cerrado en rework-list-detail).
export function AddToListPanel({ target, onClose }: AddToListPanelProps) {
  const t = useTranslations("lists");
  const tCamino = useTranslations("camino");
  const isAlbumTarget = target.type === "release-group";
  const [lists, setLists] = useState<UserListSummary[] | null>(null);
  const [caminos, setCaminos] = useState<CaminoSummary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [addedListId, setAddedListId] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCreateCamino, setShowCreateCamino] = useState(false);

  useEffect(() => {
    void loadLists();
    if (isAlbumTarget) void loadCaminos();
  }, [isAlbumTarget]);

  const loadLists = async () => {
    setBusy(true);
    setErrorCode(null);
    try {
      const result = await getMyLists(1, 50);
      setLists(result.lists);
    } catch (err) {
      setErrorCode(err instanceof ApiError ? err.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  };

  const loadCaminos = async () => {
    try {
      const result = await getMyCaminos();
      setCaminos(result.caminos);
    } catch {
      // El panel sigue siendo útil con solo Listas si esto falla.
    }
  };

  const handleAdd = async (list: UserListSummary) => {
    setBusy(true);
    setErrorCode(null);
    try {
      await addItemToList(list.id, target);
      setAddedListId(list.id);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  };

  const handleListCreated = async (created: UserListDetail) => {
    setShowCreateForm(false);
    setLists((current) => [created, ...(current ?? [])]);
    setBusy(true);
    setErrorCode(null);
    try {
      await addItemToList(created.id, target);
      setAddedListId(created.id);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  };

  const handleAddToCamino = async (camino: CaminoSummary) => {
    if (target.type !== "release-group") return;
    setBusy(true);
    setErrorCode(null);
    try {
      await addAlbumToCamino(camino.id, target.id);
      setAddedListId(camino.id);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  };

  const handleCaminoCreated = async (created: CaminoDetail) => {
    setShowCreateCamino(false);
    setCaminos((current) => [
      {
        id: created.id,
        title: created.title,
        state: created.state,
        progress: created.progress,
        coverThumbUrl: null,
        updatedAt: created.updatedAt,
      },
      ...(current ?? []),
    ]);
    if (target.type !== "release-group") return;
    setBusy(true);
    setErrorCode(null);
    try {
      await addAlbumToCamino(created.id, target.id);
      setAddedListId(created.id);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  };

  const compatible = (lists ?? []).filter((list) => isCompatible(list, target.type));

  return (
    <div className="flex w-full max-w-sm flex-col gap-3 rounded border border-ink-border bg-ink-surface p-3">
      <div className="flex flex-col gap-2">
        {compatible.length === 0 ? (
          <p className="font-body text-sm text-paper-muted">{t("emptyDescription")}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {compatible.map((list) => (
              <li key={list.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleAdd(list)}
                  className={`w-full rounded px-2 py-1.5 text-left font-data text-sm transition-colors ${
                    addedListId === list.id ? "bg-amber/10 text-amber" : "text-paper hover:bg-ink"
                  }`}
                >
                  {list.title}
                  {addedListId === list.id ? " ✓" : ""}
                </button>
              </li>
            ))}
          </ul>
        )}
        {showCreateForm ? (
          <ListForm
            fixedEntityType={target.type}
            onCreated={(created) => void handleListCreated(created)}
            onCancel={() => setShowCreateForm(false)}
          />
        ) : (
          <Button variant="ghost" disabled={busy} onClick={() => setShowCreateForm(true)}>
            {t("newList")}
          </Button>
        )}
      </div>

      {isAlbumTarget && caminos && (
        <div className="flex flex-col gap-2 border-t border-ink-border pt-3">
          <span className="font-data text-xs uppercase tracking-wider text-paper-muted">
            {tCamino("pageTitle")}
          </span>
          {caminos.length > 0 && (
            <ul className="flex flex-col gap-1">
              {caminos
                .filter((camino) => camino.state !== "archived")
                .map((camino) => (
                  <li key={camino.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleAddToCamino(camino)}
                      className={`w-full rounded px-2 py-1.5 text-left font-data text-sm transition-colors ${
                        addedListId === camino.id ? "bg-amber/10 text-amber" : "text-paper hover:bg-ink"
                      }`}
                    >
                      {camino.title}
                      {addedListId === camino.id ? ` ✓ ${tCamino("albumAdded")}` : ""}
                    </button>
                  </li>
                ))}
            </ul>
          )}
          {showCreateCamino ? (
            <CaminoForm
              onCreated={(created) => void handleCaminoCreated(created)}
              onCancel={() => setShowCreateCamino(false)}
            />
          ) : (
            <Button variant="ghost" disabled={busy} onClick={() => setShowCreateCamino(true)}>
              {tCamino("newCamino")}
            </Button>
          )}
        </div>
      )}

      {onClose ? (
        <Button variant="ghost" disabled={busy} onClick={onClose}>
          {t("collapse")}
        </Button>
      ) : null}
      {errorCode && (
        <span role="alert" className="font-data text-xs text-danger">
          {t("saveError")}
        </span>
      )}
    </div>
  );
}
