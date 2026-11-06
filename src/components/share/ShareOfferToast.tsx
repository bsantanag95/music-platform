"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UndoToast } from "@/components/ui/UndoToast";
import type { ShareTargetKind } from "@/lib/share/kinds";
import { LazyShareSheet } from "./LazyShareSheet";

// Ofrecimiento en un momento con significado (spec share-sheet): un aviso descartable, nunca un modal. No roba el foco
// y se va solo. Abrir la hoja reemplaza al aviso, para que su expiración no la cierre.

export function ShareOfferToast({
  message,
  kind,
  refId,
  onDone,
}: {
  message: string;
  kind: ShareTargetKind;
  refId: string;
  onDone: () => void;
}) {
  const t = useTranslations("share");
  const [sheetOpen, setSheetOpen] = useState(false);
  if (sheetOpen) return <LazyShareSheet open onClose={onDone} kind={kind} refId={refId} />;
  return <UndoToast message={message} undoLabel={t("button")} onUndo={() => setSheetOpen(true)} onExpire={onDone} />;
}
