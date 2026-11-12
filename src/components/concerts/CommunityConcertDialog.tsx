"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { CountryPicker } from "@/components/profiles/CountryPicker";
import { useTargetSearch } from "@/components/quick-actions/use-target-search";
import { ApiError } from "@/lib/api/client";
import { createSharedConcert, fetchConcertCandidates } from "@/lib/api/concerts";
import { concertHref } from "@/lib/catalog-links";
import {
  COMMUNITY_CONCERT_EXTRA_PERFORMERS_MAX,
  CONCERT_TEXT_MAX,
  CONCERT_URL_MAX,
  SETLISTFM_SETLIST_URL_PATTERN,
  SHARED_CONCERT_NAME_MAX,
  isValidConcertDate,
  type ConcertCandidate,
} from "@/lib/api/schemas";
import { AttendButton } from "./AttendButton";
import { formatConcertDate } from "./concert-format";
import { CONCERT_DIALOG_FOOTER, CONCERT_FIELD, CONCERT_LABEL, CONCERT_PICKER_LABEL, CloseIcon } from "./concert-ui";
import { sharedConcertPlace } from "./shared-concert-format";

// "Agregar un concierto" (openspec: add-shared-concerts-phase2, capability `community-concerts`). Primero la fecha exacta
// y el lugar; con eso se buscan los candidatos ("¿Es alguno de estos?") para sumarse con "Estuve ahí" en vez de duplicar.
// Crear es el último paso: nombre opcional, más artistas del cartel y el setlist. Desde Mis conciertos ("Compartir este
// concierto") llega con los datos del recuerdo, la fecha fija, y al crear ese recuerdo queda enlazado.

interface ArtistRef {
  id: string;
  name: string;
}

export interface ShareableEntry {
  id: string;
  eventDate: string;
  venue: string | null;
  city: string | null;
  country: string | null;
  setlistfmUrl: string | null;
}

interface CommunityConcertDialogProps {
  open: boolean;
  onClose: () => void;
  artist: ArtistRef;
  /** "Compartir este concierto": el recuerdo propio que quedará enlazado. */
  fromEntry?: ShareableEntry;
}

type Step = "place" | "candidates" | "details";
type ErrorKey =
  | "required"
  | "dateInvalid"
  | "setlistInvalid"
  | "duplicate"
  | "implausible"
  | "notAllowed"
  | "limit"
  | "suspended"
  | "generic";

const ERROR_BY_CODE: Partial<Record<string, ErrorKey>> = {
  CONCERT_DUPLICATE: "duplicate",
  CONCERT_IMPLAUSIBLE: "implausible",
  CONCERT_CREATE_NOT_ALLOWED: "notAllowed",
  CONCERT_CREATE_LIMIT: "limit",
  SOCIAL_SUSPENSION_ACTIVE: "suspended",
};

/** Hoy en UTC+14, como el servidor: nadie queda con su "hoy" rechazado. */
function latestToday(): string {
  return new Date(Date.now() + 14 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function CommunityConcertDialog({ open, onClose, artist, fromEntry }: CommunityConcertDialogProps) {
  const t = useTranslations("concerts.community.dialog");
  const locale = useLocale();
  const router = useRouter();
  const fieldId = useId();

  const [step, setStep] = useState<Step>("place");
  const [date, setDate] = useState(fromEntry?.eventDate ?? "");
  const [venue, setVenue] = useState(fromEntry?.venue ?? "");
  const [city, setCity] = useState(fromEntry?.city ?? "");
  const [country, setCountry] = useState(fromEntry?.country ?? "");
  const [name, setName] = useState("");
  const [setlistfmUrl, setSetlistfmUrl] = useState(fromEntry?.setlistfmUrl ?? "");
  const [extras, setExtras] = useState<(ArtistRef & { role: "main" | "support" })[]>([]);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<ConcertCandidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);

  const search = useTargetSearch("artist", query);
  const exampleName = t("defaultName", { artist: artist.name, venue: venue.trim() || "…" });

  async function findCandidates(): Promise<void> {
    if (!date || !venue.trim() || !city.trim() || !country) return setError("required");
    if (date.length !== 10 || !isValidConcertDate(date)) return setError("dateInvalid");
    setBusy(true);
    setError(null);
    try {
      const found = await fetchConcertCandidates(artist.id, date, city.trim());
      setCandidates(found);
      setStep(found.length > 0 ? "candidates" : "details");
    } catch {
      setError("generic");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (step !== "details") {
      if (step === "place") await findCandidates();
      return;
    }
    const url = setlistfmUrl.trim();
    if (url && (!SETLISTFM_SETLIST_URL_PATTERN.test(url) || url.length > CONCERT_URL_MAX)) return setError("setlistInvalid");
    setBusy(true);
    setError(null);
    try {
      const created = await createSharedConcert({
        artistId: artist.id,
        performers: extras.map(({ id, role }) => ({ artistId: id, role })),
        eventDate: date,
        venue: venue.trim(),
        city: city.trim(),
        country,
        name: name.trim() || exampleName,
        setlistfmUrl: url || null,
        ...(fromEntry ? { fromEntryId: fromEntry.id } : {}),
      });
      onClose();
      router.push(concertHref(created.concert.name, created.concert.id));
    } catch (caught) {
      const key = caught instanceof ApiError ? ERROR_BY_CODE[caught.code] : undefined;
      if (key === "duplicate") {
        // Otro pedido lo creó primero: se muestra para sumarse.
        try {
          setCandidates(await fetchConcertCandidates(artist.id, date, city.trim()));
          setStep("candidates");
        } catch {
          // Se queda en el formulario con el aviso.
        }
      }
      setError(key ?? "generic");
    } finally {
      setBusy(false);
    }
  }

  function addExtra(candidate: ArtistRef) {
    setQuery("");
    setExtras((current) =>
      candidate.id === artist.id || current.some((extra) => extra.id === candidate.id) || current.length >= COMMUNITY_CONCERT_EXTRA_PERFORMERS_MAX
        ? current
        : [...current, { ...candidate, role: "support" }],
    );
  }

  return (
    <Dialog open={open} onClose={onClose} title={fromEntry ? t("shareTitle") : t("title")}>
      <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <span className="font-data text-xs text-paper-muted">{t("artist")}</span>
          <span className="truncate rounded border border-ink-border bg-ink px-2.5 py-2 font-display text-sm text-paper">{artist.name}</span>
        </div>

        {step === "place" && (
          <fieldset className="flex flex-col gap-3" disabled={busy}>
            <div className="flex flex-col gap-1.5">
              <label className={CONCERT_LABEL}>
                {t("date")}
                <input
                  type="date"
                  required
                  min="1900-01-01"
                  max={latestToday()}
                  value={date}
                  readOnly={Boolean(fromEntry)}
                  aria-describedby={`${fieldId}-date-hint`}
                  onChange={(event) => setDate(event.target.value)}
                  className={CONCERT_FIELD}
                />
              </label>
              <p id={`${fieldId}-date-hint`} className="font-data text-xs text-paper-muted">
                {t("dateHint")}
              </p>
            </div>
            <label className={CONCERT_LABEL}>
              {t("venue")}
              <input
                type="text"
                required
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
                  required
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
          </fieldset>
        )}

        {step === "candidates" && (
          <section aria-labelledby={`${fieldId}-candidates`} className="flex flex-col gap-2">
            <h3 id={`${fieldId}-candidates`} className="font-display text-base text-paper">
              {t("candidatesTitle")}
            </h3>
            <p className="font-body text-sm text-paper-muted">{t("candidatesHint")}</p>
            <ul className="flex flex-col divide-y divide-ink-border rounded border border-ink-border bg-ink">
              {candidates.map((candidate) => (
                <li key={candidate.id} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <Link href={concertHref(candidate.name, candidate.id)} className="font-display text-sm text-paper underline-offset-2 hover:underline">
                      {candidate.name}
                    </Link>
                    <span className="font-data text-xs text-paper-muted">
                      {[
                        formatConcertDate(candidate.eventDate, locale),
                        sharedConcertPlace(candidate, locale),
                        candidate.sameCity ? t("sameCity") : null,
                        candidate.status === "pending" ? t("pendingBadge") : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  <AttendButton concertId={candidate.id} artistId={artist.id} initialAttending={candidate.attending} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {step === "details" && (
          <fieldset className="flex flex-col gap-3" disabled={busy}>
            {candidates.length === 0 && <p className="font-body text-sm text-paper-muted">{t("noCandidates")}</p>}
            <p className="rounded border border-ink-border bg-ink px-2.5 py-2 font-data text-xs text-paper">
              {[formatConcertDate(date, locale), sharedConcertPlace({ venue, city, country }, locale)].filter(Boolean).join(" · ")}
            </p>
            <div className="flex flex-col gap-1.5">
              <label className={CONCERT_LABEL}>
                {t("name")}
                <input
                  type="text"
                  maxLength={SHARED_CONCERT_NAME_MAX}
                  value={name}
                  placeholder={exampleName}
                  aria-describedby={`${fieldId}-name-hint`}
                  onChange={(event) => setName(event.target.value)}
                  className={CONCERT_FIELD}
                />
              </label>
              <p id={`${fieldId}-name-hint`} className="font-data text-xs text-paper-muted">
                {t("nameHint", { example: exampleName })}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="font-data text-xs text-paper-muted">
                {t("lineup")} · {t("lineupHint")}
              </span>
              {extras.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {extras.map((extra) => (
                    <li key={extra.id} className="flex items-center justify-between gap-2 rounded border border-ink-border bg-ink py-1 pl-2.5 pr-1">
                      <span className="truncate font-body text-sm text-paper">{extra.name}</span>
                      <span className="flex items-center gap-2">
                        <select
                          aria-label={t("lineupRole", { name: extra.name })}
                          value={extra.role}
                          onChange={(event) =>
                            setExtras((current) =>
                              current.map((item) => (item.id === extra.id ? { ...item, role: event.target.value as "main" | "support" } : item)),
                            )
                          }
                          className="rounded border border-ink-border bg-ink px-1.5 py-1 font-data text-xs text-paper"
                        >
                          <option value="main">{t("lineupMain")}</option>
                          <option value="support">{t("lineupSupport")}</option>
                        </select>
                        <button
                          type="button"
                          aria-label={t("lineupRemove", { name: extra.name })}
                          onClick={() => setExtras((current) => current.filter((item) => item.id !== extra.id))}
                          className="inline-flex size-8 items-center justify-center rounded text-paper-muted transition-colors hover:bg-ink-surface hover:text-paper"
                        >
                          <CloseIcon />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {extras.length < COMMUNITY_CONCERT_EXTRA_PERFORMERS_MAX && (
                <label className={CONCERT_LABEL}>
                  <span className="sr-only">{t("lineupSearch")}</span>
                  <input
                    type="search"
                    autoComplete="off"
                    value={query}
                    placeholder={t("lineupSearchPlaceholder")}
                    onChange={(event) => setQuery(event.target.value)}
                    className={CONCERT_FIELD}
                  />
                </label>
              )}
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
                <ul className="themed-scrollbar flex max-h-40 flex-col overflow-y-auto rounded border border-ink-border bg-ink">
                  {search.candidates.map((candidate) => (
                    <li key={candidate.id} className="border-b border-ink-border/70 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => addExtra({ id: candidate.id, name: candidate.title })}
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

            <div className="flex flex-col gap-1.5">
              <label className={CONCERT_LABEL}>
                {t("setlist")}
                <input
                  type="url"
                  inputMode="url"
                  maxLength={CONCERT_URL_MAX}
                  value={setlistfmUrl}
                  placeholder="https://www.setlist.fm/setlist/…"
                  aria-describedby={`${fieldId}-setlist-hint`}
                  onChange={(event) => setSetlistfmUrl(event.target.value)}
                  className={CONCERT_FIELD}
                />
              </label>
              <p id={`${fieldId}-setlist-hint`} className="font-data text-xs text-paper-muted">
                {t("setlistHint")}
              </p>
            </div>
            <p className="border-t border-ink-border pt-3 font-body text-sm text-paper-muted">{t("rules")}</p>
          </fieldset>
        )}

        <div className={CONCERT_DIALOG_FOOTER}>
          {error && (
            <p role="alert" className="basis-full font-data text-xs text-danger sm:mr-auto sm:basis-0 sm:grow">
              {t(`errors.${error}`)}
            </p>
          )}
          {step === "place" ? (
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              {t("cancel")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setError(null);
                setStep(step === "details" && candidates.length > 0 ? "candidates" : "place");
              }}
            >
              {t("back")}
            </Button>
          )}
          {/* Claves distintas: si React reutilizara el mismo <button>, el clic en «No, es otro concierto» lo convertiría en
              el de enviar dentro del mismo clic y crearía el concierto sin pasar por el paso de datos. */}
          {step === "candidates" ? (
            <Button
              key="not-listed"
              type="button"
              onClick={() => {
                setError(null);
                setStep("details");
              }}
            >
              {t("notListed")}
            </Button>
          ) : (
            <Button key={`submit-${step}`} type="submit" disabled={busy}>
              {busy ? (step === "place" ? t("checking") : t("saving")) : step === "place" ? t("continue") : t("submit")}
            </Button>
          )}
        </div>
      </form>
    </Dialog>
  );
}
