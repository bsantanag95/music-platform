"use client";

import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RowMenu, RowMenuItem } from "@/components/ui/RowMenu";
import { SECONDARY_LINK } from "@/components/ui/segmented";
import { removeConcert, unlinkConcertEntry } from "@/lib/api/concerts";
import type { ConcertEntryDto, ConcertListResponse } from "@/lib/api/schemas";
import { CommunityConcertDialog } from "./CommunityConcertDialog";
import { ConcertFormDialog } from "./ConcertFormDialog";
import { ConcertYearList } from "./ConcertYearList";
import { PlusIcon } from "./concert-ui";
import { formatConcertDate } from "./concert-format";

// Gestión de Mis conciertos (openspec: add-my-concerts): totales, registrar (con buscador de artistas), editar (con la
// audiencia) y quitar con confirmación. Los datos vienen del servidor; tras cada cambio se refresca la ruta. Un recuerdo
// sin enlazar con fecha completa, ciudad y país ofrece "Compartir este concierto" (add-shared-concerts-phase2); uno
// enlazado, "Desvincular del concierto" (add-shared-concerts-phase3). "Registrar concierto" va junto al título, como "Añadir copia"
// en Colección, y los totales quedan debajo como una línea de datos, sin las cifras en cero (polish-my-concerts).

interface OwnConcertsProps {
  initial: ConcertListResponse;
  /** Artista del filtro `?artista=`, o `null` sin filtro. */
  filter: { id: string; name: string } | null;
  /** Título e introducción de la página, a la izquierda del botón de registrar. */
  heading: ReactNode;
  /** Sugerencias de enlace de los recuerdos sueltos, entre los totales y la lista. */
  suggestions?: ReactNode;
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

export function OwnConcerts({ initial, filter, heading, suggestions = null }: OwnConcertsProps) {
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
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          {heading}
          <Button type="button" onClick={() => setDialog({ kind: "create" })}>
            <PlusIcon />
            {t("register")}
          </Button>
        </div>
        {/* Sin registros no hay totales; una cifra en cero (países sin ningún país anotado) tampoco dice nada. */}
        {totals.concerts > 0 && (
          <p className="font-data text-sm tabular-nums text-paper-muted">
            {[
              t("totals.concerts", { count: totals.concerts }),
              totals.artists > 0 ? t("totals.artists", { count: totals.artists }) : null,
              totals.countries > 0 ? t("totals.countries", { count: totals.countries }) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </header>

      {suggestions}

      {filter && (
        <p className="flex flex-wrap items-center gap-2 font-data text-xs text-paper-muted">
          <span className="rounded border border-ink-border bg-ink-surface px-2 py-1 text-paper">{t("filteredBy", { artist: filter.name })}</span>
          <Link href="/me/concerts" className={`py-1 ${SECONDARY_LINK}`}>
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
        <div className="flex flex-col items-start gap-2 rounded-lg border border-ink-border bg-ink-surface px-5 py-8 sm:px-8">
          {filter ? (
            <p className="font-body text-sm text-paper-muted">{t("empty.filtered")}</p>
          ) : (
            <>
              <p className="font-display text-lg text-paper">{t("empty.title")}</p>
              <p className="max-w-prose text-pretty font-body text-sm text-paper-muted">{t("empty.body")}</p>
            </>
          )}
        </div>
      ) : (
        <ConcertYearList
          entries={entries}
          showAudience
          onAddPlace={(entry) => setDialog({ kind: "edit", entry })}
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
