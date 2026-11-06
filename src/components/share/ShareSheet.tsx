"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/Dialog";
import { postShareEvent } from "@/lib/api/share";
import { SHARE_INTENT_CHANNELS, downloadUrl, intentUrl, withVia } from "@/lib/share/channels";
import { SHARE_FORMATS, type ShareChannel, type ShareFormat, type ShareTargetKind } from "@/lib/share/kinds";

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
  /** URL de la imagen Historia con su versión. */
  storyImageUrl: string;
  imageAlt: string;
  downloadName: string;
}

type CopyState = "idle" | "copied" | "failed";

/** Selector de formato: cambia la vista previa y la descarga, no el enlace. */
export function ShareFormatPicker({ format, onChange }: { format: ShareFormat; onChange: (format: ShareFormat) => void }) {
  const t = useTranslations("share.sheet.formats");
  return (
    <div role="group" aria-label={t("label")} className="flex gap-1 self-start rounded border border-ink-border p-0.5">
      {SHARE_FORMATS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={format === option}
          onClick={() => onChange(option)}
          className={`rounded px-3 py-1 font-data text-xs transition-colors ${format === option ? "bg-ink-border text-paper" : "text-paper-muted hover:text-paper"}`}
        >
          {t(option)}
        </button>
      ))}
    </div>
  );
}

/** Vista previa de la imagen en su formato. */
export function ShareImagePreview({ src, alt, format }: { src: string; alt: string; format: ShareFormat }) {
  const story = format === "story";
  return (
    // eslint-disable-next-line @next/next/no-img-element -- PNG ya optimizado por la ruta de imágenes
    <img
      src={src}
      alt={alt}
      width={story ? 1080 : 1200}
      height={story ? 1920 : 630}
      className={`h-auto rounded border border-ink-border bg-ink ${story ? "mx-auto aspect-[1080/1920] max-h-[50vh] w-auto" : "aspect-[1200/630] w-full"}`}
    />
  );
}

/** Nombre del archivo descargado; la Historia lleva su sufijo. */
export function shareFileName(downloadName: string, format: ShareFormat): string {
  return `${downloadName}${format === "story" ? "-story" : ""}.png`;
}

export function ShareSheet({
  open,
  onClose,
  payload,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  payload: SharePayload;
  /** Acción extra al pie (dejar de compartir). */
  footer?: ReactNode;
}) {
  const t = useTranslations("share.sheet");
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [copy, setCopy] = useState<CopyState>("idle");
  const [format, setFormat] = useState<ShareFormat>("link");
  const fallbackRef = useRef<HTMLInputElement>(null);
  // La imagen se trae al elegir Historia: esperar la red dentro del clic perdería el gesto que exige `navigator.share`.
  const storyFile = useRef<File | null>(null);
  const imageUrl = format === "story" ? payload.storyImageUrl : payload.imageUrl;

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!open) setCopy("idle");
  }, [open]);

  useEffect(() => {
    if (copy === "failed") fallbackRef.current?.select();
  }, [copy]);

  useEffect(() => {
    storyFile.current = null;
    if (format !== "story" || !canNativeShare) return;
    let cancelled = false;
    fetch(payload.storyImageUrl)
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (!cancelled && blob) storyFile.current = new File([blob], shareFileName(payload.downloadName, "story"), { type: "image/png" });
      })
      .catch(() => {
        // Sin el archivo, "Compartir…" comparte el enlace.
      });
    return () => {
      cancelled = true;
    };
  }, [format, canNativeShare, payload.storyImageUrl, payload.downloadName]);

  function record(channel: ShareChannel) {
    postShareEvent({ kind: payload.kind, ref: payload.ref, channel, format });
  }

  async function shareNative() {
    try {
      const file = storyFile.current;
      if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ title: payload.title, files: [file] });
      else await navigator.share({ title: payload.title, url: withVia(payload.url, "native") });
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
      <ShareFormatPicker format={format} onChange={setFormat} />
      <ShareImagePreview src={imageUrl} alt={t("previewAlt", { alt: payload.imageAlt })} format={format} />

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
        href={downloadUrl(imageUrl)}
        download={shareFileName(payload.downloadName, format)}
        onClick={() => record("download")}
        className="self-start font-display text-sm text-paper-muted underline-offset-4 transition-colors hover:text-paper hover:underline"
      >
        {t("download")}
      </a>
      {footer}
    </Dialog>
  );
}
