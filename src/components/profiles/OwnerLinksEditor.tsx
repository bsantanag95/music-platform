"use client";

import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { apiFetch, ApiError } from "@/lib/api/client";
import { ProfileLinksResponseSchema, type ProfileLink } from "@/lib/api/schemas";
import {
  describeStoredLink,
  displayUrl,
  editableValue,
  isHandleLinkKind,
  normalizeLinkInput,
} from "@/lib/profile-links";
import { PROFILE_LINK_KINDS, PROFILE_MAX_LINKS, type ProfileLinkKind } from "@/services/social/types";
import { useNotifySaved, useReportDirty, type EditorHostCallbacks } from "./editor-host";

interface OwnerLinksEditorProps extends EditorHostCallbacks {
  initialLinks: ProfileLink[];
}

interface Row {
  kind: ProfileLinkKind;
  /** Lo que la persona escribió: el usuario, un enlace o una dirección web. */
  value: string;
  /** Enlace anterior a la validación que no coincide con su tipo (se avisa hasta que se corrija). */
  legacy: boolean;
}

function rowFromStored(link: { kind: ProfileLinkKind; url: string }): Row {
  return {
    kind: link.kind,
    value: editableValue(link.kind, link.url),
    legacy: isHandleLinkKind(link.kind) && !describeStoredLink(link.kind, link.url).consistent,
  };
}

// Firma del conjunto guardable: las filas sin valor no se persisten, así que no
// cuentan como cambio.
function signature(rows: Row[]): string {
  return JSON.stringify(
    rows
      .map((row) => ({ kind: row.kind, value: row.value.trim() }))
      .filter((row) => row.value.length > 0),
  );
}

// Editor inline de los enlaces externos del dueño. Cada fila valida lo escrito
// con las mismas reglas que el servidor (`src/lib/profile-links.ts`): para los
// tipos por usuario pide solo el usuario (y extrae el usuario si se pega el
// enlace del sitio correcto); para sitio web/enlace acepta la dirección sin
// `https://`. El campo NO es `type="url"`: la validación nativa del navegador
// rechazaba `www.link.com` con un mensaje incomprensible. Reemplaza el conjunto
// completo vía PUT /api/me/profile/links; el orden de las filas es el orden
// persistido. Ver spec profile-identity.
export function OwnerLinksEditor({ initialLinks, onSaved, onDirtyChange }: OwnerLinksEditorProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const notifySaved = useNotifySaved(onSaved);
  const baseId = useId();
  const formRef = useRef<HTMLFormElement>(null);

  const [rows, setRows] = useState<Row[]>(() => initialLinks.map(rowFromStored));
  const [baseline, setBaseline] = useState(() => signature(initialLinks.map(rowFromStored)));
  useReportDirty(signature(rows) !== baseline, onDirtyChange);

  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  // Filas cuyo campo ya perdió el foco, y si ya se intentó guardar: el error de
  // una fila solo se muestra entonces, no mientras la persona todavía escribe.
  const [touched, setTouched] = useState<ReadonlySet<number>>(() => new Set());
  const [submitted, setSubmitted] = useState(false);

  function update(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setStatus("idle");
  }

  function siteName(kind: ProfileLinkKind): string {
    return t(`linkKind.${kind}`);
  }

  async function save() {
    setSubmitted(true);
    setErrorCode(null);

    const filled = rows.filter((row) => row.value.trim().length > 0);
    if (filled.some((row) => !normalizeLinkInput(row.kind, row.value).ok)) {
      // Hay filas inválidas: no se envía nada y se lleva el foco a la primera.
      setStatus("idle");
      queueMicrotask(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }

    setStatus("saving");
    try {
      const data = await apiFetch("/api/me/profile/links", ProfileLinksResponseSchema, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: filled.map((row) => ({ kind: row.kind, value: row.value.trim() })) }),
      });
      const saved = data.links.map(rowFromStored);
      setRows(saved);
      setBaseline(signature(saved));
      setTouched(new Set());
      setSubmitted(false);
      setStatus("saved");
      notifySaved();
    } catch (error) {
      setStatus("idle");
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    }
  }

  return (
    <form
      ref={formRef}
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <h3 className="font-display text-sm text-paper-muted">{t("edit.linksHeading")}</h3>

      <ul className="flex flex-col gap-4">
        {rows.map((row, index) => {
          const fieldId = `${baseId}-value-${index}`;
          const errorId = `${baseId}-error-${index}`;
          const noteId = `${baseId}-note-${index}`;
          const handleKind = isHandleLinkKind(row.kind);
          const hasValue = row.value.trim().length > 0;
          const result = hasValue ? normalizeLinkInput(row.kind, row.value) : null;
          const invalid = result !== null && !result.ok;
          const showError = invalid && (submitted || touched.has(index));

          // Un mensaje por fila: el error si ya corresponde mostrarlo; si no, el
          // aviso de enlace heredado que no coincide con su sitio.
          let problem: string | null = null;
          if (result && !result.ok) {
            if (showError) {
              problem = t(`edit.linkErrors.${result.reason}`, { site: siteName(row.kind) });
            } else if (row.legacy) {
              problem = t("edit.linkLegacyWarning", { site: siteName(row.kind) });
            }
          }

          // Vista previa del enlace que se guardará (tipos por usuario, o una
          // dirección web a la que se le añadió el `https://`).
          const savedUrl = result?.ok ? result.url : null;
          const preview =
            savedUrl && (handleKind || savedUrl !== row.value.trim())
              ? t("edit.linkPreview", { url: displayUrl(savedUrl) })
              : null;
          const help = handleKind
            ? [t("edit.linkHandleHelp"), t.has(`edit.linkKindHelp.${row.kind}`) ? t(`edit.linkKindHelp.${row.kind}`) : null]
                .filter(Boolean)
                .join(" ")
            : t("edit.linkWebHelp");

          return (
            <li key={index} className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1">
                  <span className="font-data text-xs text-paper-muted">{t("edit.linkKindLabel")}</span>
                  <select
                    value={row.kind}
                    aria-label={t("edit.linkKindLabel")}
                    onChange={(event) => update(index, { kind: event.target.value as ProfileLinkKind })}
                    className="filter-select appearance-none rounded border border-ink-border bg-ink-surface px-2 py-2 font-data text-sm text-paper"
                  >
                    {PROFILE_LINK_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {siteName(kind)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-w-0 flex-1 flex-col gap-1" htmlFor={fieldId}>
                  <span className="font-data text-xs text-paper-muted">
                    {handleKind ? t("edit.linkValueLabelHandle") : t("edit.linkValueLabelWeb")}
                  </span>
                  <input
                    id={fieldId}
                    type="text"
                    inputMode="url"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={row.value}
                    placeholder={t(`edit.linkPlaceholder.${row.kind}`)}
                    aria-invalid={showError || undefined}
                    aria-describedby={problem ? errorId : noteId}
                    onChange={(event) => update(index, { value: event.target.value })}
                    onBlur={() => setTouched((prev) => new Set(prev).add(index))}
                    className={`min-w-0 rounded border bg-ink-surface px-3 py-2 font-body text-paper placeholder:text-paper-muted ${
                      showError ? "border-danger" : "border-ink-border"
                    }`}
                  />
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={t("edit.removeLink")}
                  onClick={() => {
                    setRows((prev) => prev.filter((_, i) => i !== index));
                    setTouched(new Set());
                    setStatus("idle");
                  }}
                >
                  ×
                </Button>
              </div>

              {problem ? (
                <p id={errorId} role={showError ? "alert" : undefined} className="font-data text-xs text-danger">
                  {problem}
                </p>
              ) : (
                <p id={noteId} className="font-data text-xs text-paper-muted">
                  {preview ?? help}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={rows.length >= PROFILE_MAX_LINKS}
          onClick={() => {
            setRows((prev) => [...prev, { kind: "other", value: "", legacy: false }]);
            setStatus("idle");
          }}
        >
          {t("edit.addLink")}
        </Button>
        <Button type="submit" disabled={status === "saving"}>
          {status === "saving" ? t("edit.saving") : t("edit.save")}
        </Button>
        {rows.length >= PROFILE_MAX_LINKS && (
          <span className="font-data text-xs text-paper-muted">{t("edit.maxLinksReached")}</span>
        )}
        {status === "saved" && (
          <span role="status" className="font-data text-xs text-petrol-hover">
            {t("edit.saved")}
          </span>
        )}
        {errorCode && (
          <span role="alert" className="font-data text-xs text-danger">
            {tErrors(`${errorCode}.description`)}
          </span>
        )}
      </div>
    </form>
  );
}
