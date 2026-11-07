"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/Dialog";
import { getOwnShare, makeOwnShareable, postShareEvent, stopOwnShare, type OwnShareState } from "@/lib/api/share";
import { downloadUrl } from "@/lib/share/channels";
import type { ShareFormat } from "@/lib/share/kinds";
import { ShareFormatPicker, ShareImagePreview, ShareSheet, shareFileName } from "./ShareSheet";
import { ShareTrigger } from "./ShareButton";

// Hoja de lo propio (spec share-sheet, "Compartir algo propio que no es público"). Pide el estado al abrirse, así que
// mostrar el botón no cuesta ninguna consulta. Lo público usa la hoja normal; lo que no lo es, un aviso con el gesto
// explícito y la descarga privada. Nada cambia de audiencia sin ese gesto.

type OwnKind = "rating" | "listen" | "top";

export function OwnShareSheet({
  open,
  onClose,
  kind,
  refId,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  kind: OwnKind;
  refId: string;
  /** El gesto cambió algo: quien lista esa fila debe refrescarla. */
  onChanged?: () => void;
}) {
  const t = useTranslations("share.own");
  const locale = useLocale();
  const [data, setData] = useState<OwnShareState | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<ShareFormat | null>(null);
  const images = data?.payload.images ?? [];
  const current = images.find((image) => image.format === picked) ?? images[0];
  const format = current?.format ?? "link";

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setData(null);
    setFailed(false);
    getOwnShare(kind, refId, locale)
      .then((state) => {
        if (!cancelled) setData(state);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, kind, refId, locale]);

  async function run(action: () => Promise<OwnShareState>) {
    setBusy(true);
    setFailed(false);
    try {
      setData(await action());
      onChanged?.();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  if (data?.state === "public") {
    return (
      <ShareSheet
        open
        onClose={onClose}
        payload={data.payload}
        footer={
          data.canUnshare ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => stopOwnShare(refId, locale))}
              className="self-start font-display text-sm text-paper-muted underline-offset-4 transition-colors hover:text-paper hover:underline disabled:opacity-50"
            >
              {t("stop")}
            </button>
          ) : null
        }
      />
    );
  }

  const noticeKey =
    data?.state === "private_profile" ? "privateProfile" : kind === "listen" ? (data?.hasNote ? "listenNote" : "listen") : kind;

  return (
    <Dialog open title={t("title")} onClose={onClose} size="bottom">
      {data ? (
        <>
          <ShareFormatPicker formats={images.map((image) => image.format)} format={format} onChange={setPicked} />
          <ShareImagePreview src={current!.url} alt={data.payload.imageAlt} format={format} />
          <p className="font-body text-sm text-paper">{t(`notice.${noticeKey}`)}</p>
          {data.state === "needs_gesture" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => makeOwnShareable(kind, refId, locale))}
              className="inline-flex items-center justify-center rounded bg-amber px-4 py-2 font-display text-sm font-medium text-ink transition-colors hover:bg-amber-hover disabled:opacity-50"
            >
              {t("makePublic")}
            </button>
          ) : null}
          <a
            href={downloadUrl(current!.url)}
            download={shareFileName(data.payload.downloadName, format)}
            onClick={() => postShareEvent({ kind, ref: refId, channel: "download", format })}
            className="self-start font-display text-sm text-paper-muted underline-offset-4 transition-colors hover:text-paper hover:underline"
          >
            {t("download")}
          </a>
        </>
      ) : failed ? null : (
        <p role="status" className="font-body text-sm text-paper-muted">
          {t("loading")}
        </p>
      )}
      {failed ? (
        <p role="alert" className="font-body text-sm text-danger">
          {t("failed")}
        </p>
      ) : null}
    </Dialog>
  );
}

/** Compartir una valoración o escucha propia desde una fila. */
export function OwnShareButton({ kind, refId }: { kind: OwnKind; refId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ShareTrigger compact onClick={() => setOpen(true)} />
      <OwnShareSheet open={open} onClose={() => setOpen(false)} kind={kind} refId={refId} />
    </>
  );
}
