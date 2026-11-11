"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RowMenu, RowMenuItem } from "@/components/ui/RowMenu";
import { removeConcert, unlinkConcertEntry } from "@/lib/api/concerts";
import type { ConcertEntryDto, ConcertListResponse } from "@/lib/api/schemas";
import { CommunityConcertDialog } from "./CommunityConcertDialog";
import { ConcertFormDialog } from "./ConcertFormDialog";
import { ConcertYearList } from "./ConcertYearList";
import { formatConcertDate } from "./concert-format";

// Gestión de Mis conciertos (openspec: add-my-concerts): totales, registrar (con buscador de artistas), editar (con la
// audiencia) y quitar con confirmación. Los datos vienen del servidor; tras cada cambio se refresca la ruta. Un recuerdo
// sin enlazar con fecha completa, ciudad y país ofrece "Compartir este concierto" (add-shared-concerts-phase2); uno
// enlazado, "Desvincular del concierto" (add-shared-concerts-phase3).

interface OwnConcertsProps {
  initial: ConcertListResponse;
  /** Artista del filtro `?artista=`, o `null` sin filtro. */
  filter: { id: string; name: string } | null;
}

type OpenDialog =
  | { kind: "create" }
  | { kind: "edit"; entry: ConcertEntryDto }
  | { kind: "remove"; entry: ConcertEntryDto }
  | { kind: "share"; entry: ConcertEntryDto }
  | null;

/** Se puede compartir como concierto de la comunidad: sin enlazar, con el día exacto, ciudad y país. */
export function isShareableEntry(entry: ConcertEntryDto): boolean {
  return entry.concertId === null && entry.eventDate.length === 10 && Boolean(entry.city) && Boolean(entry.country);
}

export function OwnConcerts({ initial, filter }: OwnConcertsProps) {
  const t = useTranslations("concerts");
  const locale = useLocale();
  const router = useRouter();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [removeError, setRemoveError] = useState(false);
  const [unlinkError, setUnlinkError] = useState(false);
  const { totals, entries } = initial;

  const saved = () => {
    setDialog(null);
    router.refresh();
  };

  /** Desvincula del concierto compartido sin borrar el recuerdo (add-shared-concerts-phase3). */
  async function unlink(entry: ConcertEntryDto) {
    setUnlinkError(false);
    try {
      await unlinkConcertEntry(entry.id);
      router.refresh();
    } catch {
      setUnlinkError(true);
    }
  }

  async function confirmRemove(entry: ConcertEntryDto) {
    setRemoveError(false);
    try {
      await removeConcert(entry.id);
      saved();
    } catch {
      setDialog(null);
      setRemoveError(true);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-data text-sm text-paper-muted">
          {[
            t("totals.concerts", { count: totals.concerts }),
            t("totals.artists", { count: totals.artists }),
            t("totals.countries", { count: totals.countries }),
          ].join(" · ")}
        </p>
        <Button type="button" onClick={() => setDialog({ kind: "create" })}>
          {t("register")}
        </Button>
      </div>

      {filter && (
        <p className="flex flex-wrap items-baseline gap-3 font-data text-xs text-paper-muted">
          <span>{t("filteredBy", { artist: filter.name })}</span>
          <Link href="/me/concerts" className="text-paper underline-offset-2 hover:underline">
            {t("clearFilter")}
          </Link>
        </p>
      )}

      {removeError && (
        <p role="alert" className="font-data text-xs text-danger">
          {t("row.removeError")}
        </p>
      )}
      {unlinkError && (
        <p role="alert" className="font-data text-xs text-danger">
          {t("row.unlinkError")}
        </p>
      )}

      {entries.length === 0 ? (
        <div className="flex flex-col gap-1 rounded border border-ink-border bg-ink-surface p-6">
          {filter ? (
            <p className="font-body text-sm text-paper-muted">{t("empty.filtered")}</p>
          ) : (
            <>
              <p className="font-display text-base text-paper">{t("empty.title")}</p>
              <p className="font-body text-sm text-paper-muted">{t("empty.body")}</p>
            </>
          )}
        </div>
      ) : (
        <ConcertYearList
          entries={entries}
          showAudience
          renderActions={(entry) => (
            <RowMenu label={t("row.menu", { artist: entry.artist.name })}>
              <RowMenuItem onSelect={() => setDialog({ kind: "edit", entry })}>{t("row.edit")}</RowMenuItem>
              {isShareableEntry(entry) && (
                <RowMenuItem onSelect={() => setDialog({ kind: "share", entry })}>{t("community.share")}</RowMenuItem>
              )}
              {entry.concertId && <RowMenuItem onSelect={() => void unlink(entry)}>{t("row.unlink")}</RowMenuItem>}
              <RowMenuItem danger onSelect={() => setDialog({ kind: "remove", entry })}>
                {t("row.remove")}
              </RowMenuItem>
            </RowMenu>
          )}
        />
      )}
      {initial.truncated && <p className="font-data text-xs text-paper-muted">{t("truncated", { count: entries.length })}</p>}

      {dialog?.kind === "create" && (
        <ConcertFormDialog open mode="create" artist={filter} onClose={() => setDialog(null)} onSaved={saved} />
      )}
      {dialog?.kind === "edit" && (
        <ConcertFormDialog open mode="edit" entry={dialog.entry} onClose={() => setDialog(null)} onSaved={saved} />
      )}
      {dialog?.kind === "share" && (
        <CommunityConcertDialog
          open
          artist={dialog.entry.artist}
          fromEntry={{
            id: dialog.entry.id,
            eventDate: dialog.entry.eventDate,
            venue: dialog.entry.venue,
            city: dialog.entry.city,
            country: dialog.entry.country,
            setlistfmUrl: dialog.entry.setlistfmUrl,
          }}
          onClose={() => setDialog(null)}
        />
      )}
      <ConfirmDialog
        open={dialog?.kind === "remove"}
        title={t("row.removeTitle")}
        message={
          dialog?.kind === "remove"
            ? t("row.removeMessage", { artist: dialog.entry.artist.name, date: formatConcertDate(dialog.entry.eventDate, locale) })
            : ""
        }
        confirmLabel={t("row.removeConfirm")}
        cancelLabel={t("row.cancel")}
        danger
        onConfirm={() => {
          if (dialog?.kind === "remove") void confirmRemove(dialog.entry);
        }}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}
