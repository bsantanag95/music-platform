"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/Dialog";
import { getSharePayload } from "@/lib/api/share";
import type { ShareTargetKind } from "@/lib/share/kinds";
import { ShareSheet, type SharePayload } from "./ShareSheet";

// Hoja que pide sus datos al abrirse (spec share-sheet, "Compartir desde los menús"): un menú o un aviso no pagan una
// consulta por fila, y el enlace sale con su slug y su versión, calculado como anónimo.

export function LazyShareSheet({ open, onClose, kind, refId }: { open: boolean; onClose: () => void; kind: ShareTargetKind; refId: string }) {
  const t = useTranslations("share.own");
  const locale = useLocale();
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPayload(null);
    setFailed(false);
    getSharePayload(kind, refId, locale)
      .then((loaded) => {
        if (!cancelled) setPayload(loaded);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, kind, refId, locale]);

  if (!open) return null;
  if (payload) return <ShareSheet open onClose={onClose} payload={payload} />;
  return (
    <Dialog open title={t("title")} onClose={onClose} size="bottom">
      {failed ? (
        <p role="alert" className="font-body text-sm text-paper">
          {t("unavailable")}
        </p>
      ) : (
        <p role="status" className="font-body text-sm text-paper-muted">
          {t("loading")}
        </p>
      )}
    </Dialog>
  );
}
