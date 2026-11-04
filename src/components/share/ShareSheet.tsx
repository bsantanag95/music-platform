"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/Dialog";
import { postShareEvent } from "@/lib/api/share";
import { SHARE_INTENT_CHANNELS, downloadUrl, intentUrl, withVia } from "@/lib/share/channels";
import type { ShareChannel, ShareTargetKind } from "@/lib/share/kinds";

// Hoja de compartir (spec share-sheet): vista previa de la imagen Enlace, menú nativo si existe, copiar enlace,
// atajos por canal y descarga. Todo lo calcula el servidor (URL canónica, imagen versionada, textos): el
// cliente no decide visibilidad ni versiones. Cada acción completada se registra sin bloquear (share-events).

export interface SharePayload {
  kind: ShareTargetKind;
  ref: string;
  /** URL canónica absoluta, sin query. */
  url: string;
  title: string;
  /** URL de la imagen Enlace con su versión. */
  imageUrl: string;
  imageAlt: string;
  downloadName: string;
}

type CopyState = "idle" | "copied" | "failed";

export function ShareSheet({ open, onClose, payload }: { open: boolean; onClose: () => void; payload: SharePayload }) {
  const t = useTranslations("share.sheet");
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [copy, setCopy] = useState<CopyState>("idle");
  const fallbackRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!open) setCopy("idle");
  }, [open]);

  useEffect(() => {
    if (copy === "failed") fallbackRef.current?.select();
  }, [copy]);

  function record(channel: ShareChannel) {
    postShareEvent({ kind: payload.kind, ref: payload.ref, channel, format: "link" });
  }

  async function shareNative() {
    try {
      await navigator.share({ title: payload.title, url: withVia(payload.url, "native") });
      record("native");
    } catch {
      // Cancelar el menú del sistema no es un error: la hoja queda abierta y no se registra nada.
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(withVia(payload.url, "copy"));
      setCopy("copied");
      record("copy");
    } catch {
      setCopy("failed");
    }
  }

  return (
    <Dialog open={open} title={t("title")} onClose={onClose} size="bottom">
      {/* eslint-disable-next-line @next/next/no-img-element -- PNG ya optimizado por la ruta de imágenes */}
      <img
        src={payload.imageUrl}
        alt={t("previewAlt", { alt: payload.imageAlt })}
        width={1200}
        height={630}
        className="aspect-[1200/630] h-auto w-full rounded border border-ink-border bg-ink"
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        {canNativeShare ? (
          <button
            type="button"
            onClick={shareNative}
            className="inline-flex flex-1 items-center justify-center rounded bg-amber px-4 py-2 font-display text-sm font-medium text-ink transition-colors hover:bg-amber-hover"
          >
            {t("native")}
          </button>
        ) : null}
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex flex-1 items-center justify-center rounded border border-ink-border bg-ink px-4 py-2 font-display text-sm font-medium text-paper transition-colors hover:border-amber"
        >
          {t("copy")}
        </button>
      </div>

      <p role="status" aria-live="polite" className="min-h-5 text-sm text-paper-muted">
        {copy === "copied" ? t("copied") : null}
      </p>
      {copy === "failed" ? (
        <label className="flex flex-col gap-1 text-sm text-paper-muted">
          {t("copyFallback")}
          <input
            ref={fallbackRef}
            readOnly
            value={withVia(payload.url, "copy")}
            onFocus={(event) => event.currentTarget.select()}
            className="rounded border border-ink-border bg-ink px-3 py-2 font-data text-xs text-paper"
          />
        </label>
      ) : null}

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SHARE_INTENT_CHANNELS.map((channel) => {
          const name = t(`channels.${channel}`);
          return (
            <li key={channel}>
              <a
                href={intentUrl(channel, payload.title, withVia(payload.url, channel))}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("openIn", { channel: name })}
                onClick={() => record(channel)}
                className="flex items-center justify-center rounded border border-ink-border px-3 py-2 font-display text-sm text-paper transition-colors hover:border-amber"
              >
                {name}
              </a>
            </li>
          );
        })}
      </ul>

      <a
        href={downloadUrl(payload.imageUrl)}
        download={`${payload.downloadName}.png`}
        onClick={() => record("download")}
        className="self-start font-display text-sm text-paper-muted underline-offset-4 transition-colors hover:text-paper hover:underline"
      >
        {t("download")}
      </a>
    </Dialog>
  );
}
