"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { apiFetch, ApiError } from "@/lib/api/client";
import { ProfileLinksResponseSchema, type ProfileLink } from "@/lib/api/schemas";
import { PROFILE_LINK_KINDS, PROFILE_MAX_LINKS, type ProfileLinkKind } from "@/services/social/types";

interface OwnerLinksEditorProps {
  initialLinks: ProfileLink[];
}

interface Row {
  kind: ProfileLinkKind;
  url: string;
}

// Editor inline de los enlaces externos del dueño. Reemplaza el conjunto
// completo vía PUT /api/me/profile/links; el orden de las filas es el orden
// persistido. Ver spec profile-identity.
export function OwnerLinksEditor({ initialLinks }: OwnerLinksEditorProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const [rows, setRows] = useState<Row[]>(
    initialLinks.map((link) => ({ kind: link.kind, url: link.url })),
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  function update(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setStatus("idle");
  }

  async function save() {
    setStatus("saving");
    setErrorCode(null);
    try {
      const links = rows
        .map((row) => ({ kind: row.kind, url: row.url.trim() }))
        .filter((row) => row.url.length > 0);
      const data = await apiFetch("/api/me/profile/links", ProfileLinksResponseSchema, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links }),
      });
      setRows(data.links.map((link) => ({ kind: link.kind, url: link.url })));
      setStatus("saved");
    } catch (error) {
      setStatus("idle");
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    }
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <h3 className="font-display text-sm text-paper-muted">{t("edit.linksHeading")}</h3>

      <ul className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <li key={index} className="flex flex-wrap items-end gap-2">
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
                    {t(`linkKind.${kind}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-data text-xs text-paper-muted">{t("edit.linkUrlLabel")}</span>
              <input
                type="url"
                inputMode="url"
                value={row.url}
                placeholder={t("edit.linkUrlPlaceholder")}
                onChange={(event) => update(index, { url: event.target.value })}
                className="min-w-0 rounded border border-ink-border bg-ink-surface px-3 py-2 font-body text-paper placeholder:text-paper-muted"
              />
            </label>
            <Button
              type="button"
              variant="ghost"
              aria-label={t("edit.removeLink")}
              onClick={() => {
                setRows((prev) => prev.filter((_, i) => i !== index));
                setStatus("idle");
              }}
            >
              ×
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={rows.length >= PROFILE_MAX_LINKS}
          onClick={() => {
            setRows((prev) => [...prev, { kind: "website", url: "" }]);
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
