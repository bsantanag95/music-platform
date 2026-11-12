"use client";

import { useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Chevron } from "@/components/ui/Chevron";
import { CountryPicker } from "@/components/profiles/CountryPicker";
import { useTargetSearch } from "@/components/quick-actions/use-target-search";
import { ApiError } from "@/lib/api/client";
import { createConcert, updateConcert } from "@/lib/api/concerts";
import {
  CONCERT_MIN_YEAR,
  CONCERT_NOTE_MAX,
  CONCERT_TEXT_MAX,
  CONCERT_URL_MAX,
  SETLISTFM_SETLIST_URL_PATTERN,
  isValidConcertDate,
  type ConcertEntryDto,
  type DiaryAudience,
} from "@/lib/api/schemas";
import { concertDateParts } from "./concert-format";
import { CONCERT_DIALOG_FOOTER, CONCERT_FIELD, CONCERT_LABEL, CONCERT_PICKER_LABEL } from "./concert-ui";

// Formulario de un concierto en un diálogo (openspec: add-my-concerts). Se abre desde la fila En vivo del panel del
// artista (artista fijo) y desde Mis conciertos (con buscador de artistas, o para editar un registro). La fecha se arma
// con la precisión que la persona recuerde: el año es obligatorio; el mes y el día, opcionales. Al crear no se elige
// audiencia: el servidor aplica la audiencia por defecto del usuario (spec default-audience); al editar sí. Lo esencial
// (artista, fecha, lugar) queda a la vista; la gira, el setlist y la nota van plegados y se abren solos si ya tienen
// datos o si el error está ahí. El pie con el error y las acciones queda fijo mientras el formulario se desplaza.

const AUDIENCES: DiaryAudience[] = ["private", "followers", "public"];

interface ArtistRef {
  id: string;
  name: string;
}

type ConcertFormDialogProps = {
  open: boolean;
  onClose: () => void;
  onSaved: (entry: ConcertEntryDto) => void;
} & ({ mode: "create"; artist: ArtistRef | null } | { mode: "edit"; entry: ConcertEntryDto });

type ErrorKey = "artistRequired" | "yearInvalid" | "dateFuture" | "dayInvalid" | "setlistInvalid" | "generic";
type FieldKey = "artist" | "year" | "day" | "setlist";

/** Campo al que pertenece cada error: se marca como inválido y recibe el foco. */
const ERROR_FIELD: Partial<Record<ErrorKey, FieldKey>> = {
  artistRequired: "artist",
  yearInvalid: "year",
  dateFuture: "year",
  dayInvalid: "day",
  setlistInvalid: "setlist",
};

/** Arma la fecha parcial; `null` si el año no es un número de 4 cifras. */
export function buildConcertDate(year: string, month: string, day: string): string | null {
  const y = year.trim();
  if (!/^\d{4}$/.test(y)) return null;
  if (!month) return y;
  const m = month.padStart(2, "0");
  return day ? `${y}-${m}-${day.padStart(2, "0")}` : `${y}-${m}`;
}

/** Qué falla en la fecha armada, para un mensaje concreto; `null` si es válida. */
function dateError(year: string, month: string, day: string): ErrorKey | null {
  const value = buildConcertDate(year, month, day);
  if (value === null || Number(year) < CONCERT_MIN_YEAR) return "yearInvalid";
  if (day) {
    const probe = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (probe.getUTCMonth() !== Number(month) - 1) return "dayInvalid";
  }
  // Formato, año mínimo y día ya revisados: lo único que queda por fallar es una fecha futura.
  return isValidConcertDate(value) ? null : "dateFuture";
}

export function ConcertFormDialog(props: ConcertFormDialogProps) {
  const t = useTranslations("concerts.form");
  const tAudience = useTranslations("concerts.audience");
  const locale = useLocale();
  const fieldId = useId();
  const initial = props.mode === "edit" ? props.entry : null;
  const initialDate = initial ? concertDateParts(initial.eventDate) : null;

  const [artist, setArtist] = useState<ArtistRef | null>(props.mode === "edit" ? props.entry.artist : props.artist);
  const [query, setQuery] = useState("");
  const [year, setYear] = useState(initialDate ? String(initialDate.year) : "");
  const [month, setMonth] = useState(initialDate?.month ? String(initialDate.month) : "");
  const [day, setDay] = useState(initialDate?.day ? String(initialDate.day) : "");
  const [country, setCountry] = useState(initial?.country ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [venue, setVenue] = useState(initial?.venue ?? "");
  const [tour, setTour] = useState(initial?.tour ?? "");
  const [setlistfmUrl, setSetlistfmUrl] = useState(initial?.setlistfmUrl ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [audience, setAudience] = useState<DiaryAudience>(initial?.audience ?? "followers");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [extrasOpen, setExtrasOpen] = useState(Boolean(initial?.tour || initial?.setlistfmUrl || initial?.note));
  const fields = useRef<Partial<Record<FieldKey, HTMLElement | null>>>({});
  const invalid = error ? ERROR_FIELD[error] : undefined;

  // El artista solo se elige con buscador al crear desde Mis conciertos sin artista, o al cambiarlo.
  const canChangeArtist = !(props.mode === "create" && props.artist !== null);
  const search = useTargetSearch("artist", artist ? "" : query);

  /** Muestra el error y lleva el foco al campo que lo causó (abriendo antes los opcionales si está ahí). */
  function fail(key: ErrorKey) {
    setError(key);
    const field = ERROR_FIELD[key];
    if (!field) return;
    if (field === "setlist") setExtrasOpen(true);
    requestAnimationFrame(() => fields.current[field]?.focus());
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (!artist) return fail("artistRequired");
    const problem = dateError(year, month, day);
    if (problem) return fail(problem);
    const url = setlistfmUrl.trim();
    if (url && (!SETLISTFM_SETLIST_URL_PATTERN.test(url) || url.length > CONCERT_URL_MAX)) return fail("setlistInvalid");

    const payload = {
      artistId: artist.id,
      eventDate: buildConcertDate(year, month, day)!,
      country: country || null,
      city: city.trim() || null,
      venue: venue.trim() || null,
      tour: tour.trim() || null,
      setlistfmUrl: url || null,
      note: note.trim() || null,
    };
    setSaving(true);
    setError(null);
    try {
      const saved =
        props.mode === "edit" ? await updateConcert(props.entry.id, { ...payload, audience }) : await createConcert(payload);
      props.onSaved(saved);
    } catch (caught) {
      fail(caught instanceof ApiError && caught.code === "ARTIST_NOT_FOUND" ? "artistRequired" : "generic");
    } finally {
      setSaving(false);
    }
  }

  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const days = Array.from({ length: 31 }, (_, index) => index + 1);

  return (
    <Dialog open={props.open} onClose={props.onClose} title={props.mode === "edit" ? t("editTitle") : t("createTitle")}>
      <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <span className="font-data text-xs text-paper-muted">{t("artist")}</span>
          {artist ? (
            <div className="flex items-center justify-between gap-3 rounded border border-ink-border bg-ink px-2.5 py-2">
              <span className="truncate font-display text-sm text-paper">{artist.name}</span>
              {canChangeArtist && (
                <button
                  type="button"
                  className="shrink-0 font-data text-xs text-paper-muted underline-offset-2 hover:text-paper hover:underline"
                  onClick={() => {
                    setArtist(null);
                    setQuery("");
                  }}
                >
                  {t("artistChange")}
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className={CONCERT_LABEL} htmlFor={`${fieldId}-artist`}>
                <span className="sr-only">{t("artistSearch")}</span>
                <input
                  id={`${fieldId}-artist`}
                  ref={(node) => {
                    fields.current.artist = node;
                  }}
                  type="search"
                  autoComplete="off"
                  aria-invalid={invalid === "artist"}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("artistSearchPlaceholder")}
                  className={CONCERT_FIELD}
                />
              </label>
              {search.searchable && (
                <p aria-live="polite" className="font-data text-xs text-paper-muted">
                  {search.failed
                    ? t("searchError")
                    : search.candidates.length === 0
                      ? search.pending
                        ? t("searching")
                        : t("noResults")
                      : null}
                </p>
              )}
              {search.candidates.length > 0 && (
                <ul className="themed-scrollbar flex max-h-48 flex-col overflow-y-auto rounded border border-ink-border bg-ink">
                  {search.candidates.map((candidate) => (
                    <li key={candidate.id} className="border-b border-ink-border/70 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => {
                          setArtist({ id: candidate.id, name: candidate.title });
                          setError(null);
                        }}
                        className="flex min-h-11 w-full flex-col items-start justify-center px-2.5 py-1.5 text-left transition-colors hover:bg-ink-surface focus-visible:-outline-offset-2"
                      >
                        <span className="font-body text-sm text-paper">{candidate.title}</span>
                        {candidate.subtitle && <span className="font-data text-xs text-paper-muted">{candidate.subtitle}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <fieldset className="flex flex-col gap-1.5" disabled={saving}>
          <legend className="pb-1.5 font-data text-xs text-paper-muted">{t("date")}</legend>
          <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2 sm:grid-cols-[5rem_minmax(0,1fr)_6.5rem]">
            <label className={CONCERT_LABEL}>
              {t("year")}
              <input
                ref={(node) => {
                  fields.current.year = node;
                }}
                type="text"
                inputMode="numeric"
                maxLength={4}
                required
                aria-invalid={invalid === "year"}
                aria-describedby={`${fieldId}-date-hint`}
                value={year}
                onChange={(event) => setYear(event.target.value.replace(/\D/g, ""))}
                className={`${CONCERT_FIELD} tabular-nums`}
              />
            </label>
            <label className={CONCERT_LABEL}>
              {t("month")}
              <select
                value={month}
                onChange={(event) => {
                  setMonth(event.target.value);
                  if (!event.target.value) setDay("");
                }}
                className={CONCERT_FIELD}
              >
                <option value="">{t("monthNone")}</option>
                {months.map((value) => (
                  <option key={value} value={String(value)}>
                    {new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2000, value - 1, 1)))}
                  </option>
                ))}
              </select>
            </label>
            <label className={`${CONCERT_LABEL} col-span-2 sm:col-span-1`}>
              {t("day")}
              <select
                ref={(node) => {
                  fields.current.day = node;
                }}
                value={day}
                disabled={!month}
                aria-invalid={invalid === "day"}
                onChange={(event) => setDay(event.target.value)}
                className={`${CONCERT_FIELD} tabular-nums`}
              >
                <option value="">{t("dayNone")}</option>
                {days.map((value) => (
                  <option key={value} value={String(value)}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p id={`${fieldId}-date-hint`} className="font-data text-xs text-paper-muted">
            {t("dateHint")}
          </p>
        </fieldset>

        {/* El lugar, en el orden en que después se lee: recinto · ciudad, país. */}
        <div className="flex flex-col gap-3">
          <label className={CONCERT_LABEL}>
            {t("venue")}
            <input
              type="text"
              maxLength={CONCERT_TEXT_MAX}
              value={venue}
              placeholder={t("venuePlaceholder")}
              onChange={(event) => setVenue(event.target.value)}
              className={CONCERT_FIELD}
            />
          </label>
          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
            <label className={CONCERT_LABEL}>
              {t("city")}
              <input
                type="text"
                maxLength={CONCERT_TEXT_MAX}
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className={CONCERT_FIELD}
              />
            </label>
            <CountryPicker
              id={`${fieldId}-country`}
              label={t("country")}
              value={country}
              onChange={setCountry}
              inputClassName={CONCERT_FIELD}
              labelClassName={CONCERT_PICKER_LABEL}
            />
          </div>
        </div>

        <details
          open={extrasOpen}
          onToggle={(event) => setExtrasOpen(event.currentTarget.open)}
          className="group border-t border-ink-border pt-3"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded py-1 font-data text-xs text-paper-muted transition-colors hover:text-paper [&::-webkit-details-marker]:hidden">
            <span>
              <span className="text-paper">{t("extras")}</span> · {t("optional")}
            </span>
            <Chevron direction="down" className="group-open:rotate-180" />
          </summary>
          <div className="flex flex-col gap-3 pt-3">
            <label className={CONCERT_LABEL}>
              {t("tour")}
              <input
                type="text"
                maxLength={CONCERT_TEXT_MAX}
                value={tour}
                onChange={(event) => setTour(event.target.value)}
                className={CONCERT_FIELD}
              />
            </label>

            <div className="flex flex-col gap-1.5">
              <label className={CONCERT_LABEL}>
                {t("setlist")}
                <input
                  ref={(node) => {
                    fields.current.setlist = node;
                  }}
                  type="url"
                  inputMode="url"
                  maxLength={CONCERT_URL_MAX}
                  value={setlistfmUrl}
                  placeholder="https://www.setlist.fm/setlist/…"
                  aria-invalid={invalid === "setlist"}
                  aria-describedby={`${fieldId}-setlist-hint`}
                  onChange={(event) => setSetlistfmUrl(event.target.value)}
                  className={CONCERT_FIELD}
                />
              </label>
              <p id={`${fieldId}-setlist-hint`} className="font-data text-xs text-paper-muted">
                {t("setlistHint")}
              </p>
            </div>

            <label className={CONCERT_LABEL}>
              {t("note")}
              <input
                type="text"
                maxLength={CONCERT_NOTE_MAX}
                value={note}
                placeholder={t("notePlaceholder")}
                onChange={(event) => setNote(event.target.value)}
                className={CONCERT_FIELD}
              />
            </label>
          </div>
        </details>

        {props.mode === "edit" && (
          <fieldset className="flex flex-col" disabled={saving}>
            <legend className="pb-1.5 font-data text-xs text-paper-muted">{t("audienceLabel")}</legend>
            <div className="flex flex-wrap gap-1.5">
              {AUDIENCES.map((value) => {
                const active = audience === value;
                return (
                  <label
                    key={value}
                    className={`cursor-pointer rounded border px-2.5 py-1.5 font-data text-xs transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-amber ${
                      active ? "border-amber bg-amber/10 text-amber" : "border-ink-border text-paper-muted hover:text-paper"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`${fieldId}-audience`}
                      className="sr-only"
                      checked={active}
                      onChange={() => setAudience(value)}
                    />
                    {tAudience(value)}
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className={CONCERT_DIALOG_FOOTER}>
          {error && (
            <p role="alert" className="basis-full font-data text-xs text-danger sm:mr-auto sm:basis-0 sm:grow">
              {t(`errors.${error}`)}
            </p>
          )}
          <Button type="button" variant="ghost" onClick={props.onClose} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t("saving") : t("save")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
