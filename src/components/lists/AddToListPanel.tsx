"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getMyLists, addItemToList } from "@/lib/api/lists";
import { ApiError } from "@/lib/api/client";
import type { ListTarget, UserListDetail, UserListSummary } from "@/lib/api/schemas";
import { ListForm } from "./ListForm";

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
export function AddToListPanel({ target, onClose }: AddToListPanelProps) {
  const t = useTranslations("lists");
  const [lists, setLists] = useState<UserListSummary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [addedListId, setAddedListId] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    void loadLists();
  }, []);

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

  const compatible = (lists ?? []).filter((list) => isCompatible(list, target.type));

  return (
    <div className="flex w-full max-w-sm flex-col gap-2 rounded border border-ink-border bg-ink-surface p-3">
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
        <div className="flex items-center gap-2">
          <Button variant="ghost" disabled={busy} onClick={() => setShowCreateForm(true)}>
            {t("newList")}
          </Button>
          {onClose ? (
            <Button variant="ghost" disabled={busy} onClick={onClose}>
              {t("collapse")}
            </Button>
          ) : null}
        </div>
      )}
      {errorCode && (
        <span role="alert" className="font-data text-xs text-danger">
          {t("saveError")}
        </span>
      )}
    </div>
  );
}
