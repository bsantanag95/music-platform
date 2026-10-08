"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import type { ListEntityType } from "@/lib/api/schemas";
import { ActionChips } from "./ActionChips";
import { TargetPicker } from "./TargetPicker";
import { AddToListStep } from "./panels/AddToListStep";
import { CollectionPanel } from "./panels/CollectionPanel";
import { JourneyPanel } from "./panels/JourneyPanel";
import { ListenPanel } from "./panels/ListenPanel";
import { MarkPanel } from "./panels/MarkPanel";
import { NewCaminoPanel } from "./panels/NewCaminoPanel";
import { NewListPanel } from "./panels/NewListPanel";
import { RatePanel } from "./panels/RatePanel";
import {
  ACTION_PICKER_TYPES,
  pickerTypeForList,
  type PickerType,
  type PickTarget,
  type QuickAction,
  type TargetAction,
} from "./types";

interface QuickActionsDialogProps {
  onClose: () => void;
}

// Diálogo de acciones rápidas del Header (openspec: add-header-quick-actions): un solo diálogo con
// las acciones como chips. Abre siempre en Escucha con el foco en el buscador, de modo que
// registrar una escucha cuesta lo mismo que antes (abrir y escribir). Las acciones con objetivo
// comparten el buscador; Nueva lista no lo necesita. A11y al nivel de `GetStartedModal`: portal,
// focus-trap, Escape, retorno de foco (lo hace el botón que lo monta).
export function QuickActionsDialog({ onClose }: QuickActionsDialogProps) {
  const t = useTranslations("quickActions");
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  const [action, setAction] = useState<QuickAction>("listen");
  const [target, setTarget] = useState<PickTarget | null>(null);
  const [rawQuery, setRawQuery] = useState("");
  const [searchType, setSearchType] = useState<PickerType>("album");
  // Tras crear una lista, "Agregar a esta lista" fija la búsqueda al tipo de la lista.
  const [lockedType, setLockedType] = useState<PickerType | null>(null);

  useEffect(() => setMounted(true), []);

  // Focus-trap + Escape + bloqueo de scroll. Espera a `mounted` para que el portal ya esté en el DOM.
  useEffect(() => {
    if (!mounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), textarea:not([disabled]), [role="radio"][aria-checked="true"]',
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, mounted]);

  // El foco vuelve al buscador cada vez que se muestra (apertura, cambio de acción, elegir otro).
  const pickerVisible = action !== "newList" && action !== "newCamino" && target === null;
  useEffect(() => {
    if (mounted && pickerVisible) searchInputRef.current?.focus();
  }, [mounted, pickerVisible, action]);

  const changeAction = useCallback(
    (next: QuickAction) => {
      setAction(next);
      setTarget(null);
      setLockedType(null);
      if (next !== "newList" && next !== "newCamino") {
        const allowed = ACTION_PICKER_TYPES[next];
        if (!allowed.includes(searchType)) setSearchType(allowed[0] ?? "album");
      }
    },
    [searchType],
  );

  const addItemsToList = useCallback((entityType: ListEntityType) => {
    const type = pickerTypeForList(entityType);
    setAction("addToList");
    setTarget(null);
    setRawQuery("");
    setSearchType(type);
    setLockedType(type);
  }, []);

  const reset = (clearQuery: boolean) => {
    setTarget(null);
    if (clearQuery) setRawQuery("");
  };

  if (!mounted) return null;

  const noTarget = action === "newList" || action === "newCamino";
  const pickerTypes = lockedType ? [lockedType] : noTarget ? [] : ACTION_PICKER_TYPES[action];
  const panelKey = target ? `${action}:${target.type}:${target.id}` : action;

  const renderPanel = (targetAction: TargetAction, picked: PickTarget) => {
    switch (targetAction) {
      case "listen":
        return <ListenPanel key={panelKey} target={picked} onReset={() => reset(true)} onNavigate={onClose} />;
      case "rate":
        return <RatePanel key={panelKey} target={picked} onReset={() => reset(false)} onNavigate={onClose} />;
      case "favorite":
        return <MarkPanel key={panelKey} kind="favorite" target={picked} onReset={() => reset(false)} />;
      case "pending":
        return <MarkPanel key={panelKey} kind="pending" target={picked} onReset={() => reset(false)} />;
      case "collection":
        return <CollectionPanel key={panelKey} target={picked} onReset={() => reset(false)} />;
      case "journey":
        return <JourneyPanel key={panelKey} target={picked} onReset={() => reset(false)} onNavigate={onClose} />;
      case "addToList":
        return <AddToListStep key={panelKey} target={picked} onReset={() => reset(false)} />;
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/70 p-4 pt-16 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex w-full max-w-lg flex-col gap-5 rounded-xl border border-ink-border bg-ink-surface p-6 shadow-2xl shadow-black/60"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-display text-lg text-paper">
            {t("title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="-mr-2 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-md text-paper-muted transition-colors hover:bg-ink hover:text-paper"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
              className="size-4"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <ActionChips value={action} onChange={changeAction} />

        <div className="border-t border-ink-border pt-4">
          {action === "newList" ? (
            <NewListPanel onAddItems={addItemsToList} onNavigate={onClose} />
          ) : action === "newCamino" ? (
            <NewCaminoPanel onAddAlbums={() => addItemsToList("release-group")} onNavigate={onClose} />
          ) : target ? (
            renderPanel(action, target)
          ) : (
            <TargetPicker
              types={pickerTypes}
              type={searchType}
              onTypeChange={setSearchType}
              rawQuery={rawQuery}
              onRawQueryChange={setRawQuery}
              onPick={setTarget}
              inputRef={searchInputRef}
              inputId={`${titleId}-q`}
              prompt={t(`prompt.${action}`)}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
