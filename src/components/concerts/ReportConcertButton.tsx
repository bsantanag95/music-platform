"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { reportSharedConcert } from "@/lib/api/concerts";
import { CONCERT_REPORT_DETAILS_MAX, CONCERT_REPORT_REASONS, type ConcertReportReason } from "@/lib/api/schemas";

// "Reportar" en la página de un concierto (openspec: add-shared-concerts-phase2, capability `content-moderation`): motivo
// cerrado (no ocurrió, duplicado, datos erróneos) y un texto opcional. Solo con sesión (lo decide quien lo usa).

export function ReportConcertButton({ concertId }: { concertId: string }) {
  const t = useTranslations("concerts.community.report");
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ConcertReportReason>("did_not_happen");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("sending");
    try {
      await reportSharedConcert(concertId, { reason, details: details.trim() || null });
      setState("sent");
      setOpen(false);
    } catch {
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <p role="status" className="font-data text-xs text-paper-muted">
        {t("sent")}
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-data text-xs text-paper-muted underline-offset-2 hover:text-paper hover:underline"
      >
        {t("open")}
      </button>
      {open && (
        <Dialog open onClose={() => setOpen(false)} title={t("title")}>
          <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-2" disabled={state === "sending"}>
              <legend className="mb-1 font-data text-xs text-paper-muted">{t("reasonLabel")}</legend>
              {CONCERT_REPORT_REASONS.map((value) => (
                <label key={value} className="flex items-center gap-2 font-body text-sm text-paper">
                  <input
                    type="radio"
                    name={`${fieldId}-reason`}
                    value={value}
                    checked={reason === value}
                    onChange={() => setReason(value)}
                  />
                  {t(`reasons.${value}`)}
                </label>
              ))}
            </fieldset>
            <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
              {t("details")}
              <textarea
                value={details}
                maxLength={CONCERT_REPORT_DETAILS_MAX}
                onChange={(event) => setDetails(event.target.value)}
                className="min-h-20 rounded border border-ink-border bg-ink px-2 py-1.5 font-body text-base text-paper sm:text-sm"
              />
            </label>
            {state === "error" && (
              <p role="alert" className="font-data text-xs text-danger">
                {t("error")}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={state === "sending"}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={state === "sending"}>
                {state === "sending" ? t("sending") : t("submit")}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
