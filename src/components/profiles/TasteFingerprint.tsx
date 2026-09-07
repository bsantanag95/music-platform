import { getTranslations } from "next-intl/server";
import type { RidgePoint, TasteFingerprint as TasteFingerprintData } from "@/services/profiles/stats";

interface TasteFingerprintProps {
  fingerprint: TasteFingerprintData;
}

// La huella de gusto: el momento focal del perfil y el único lugar donde el
// ámbar se gasta con generosidad (excepción sancionada a la Regla de Rareza,
// ver DESIGN.md). Curva de valoraciones + crestas de décadas y géneros +
// reparto por tipo. Server Component; recibe la huella ya filtrada por
// audiencia desde `getTasteFingerprint`. Ver spec taste-fingerprint.
export async function TasteFingerprint({ fingerprint }: TasteFingerprintProps) {
  const t = await getTranslations("users");
  const { ratingCurve, totalRatings, decades, genres, genreDataAvailable, split } = fingerprint;

  const splitParts = [
    split.ratedArtists > 0 && t("fingerprint.splitArtists", { count: split.ratedArtists }),
    split.ratedAlbums > 0 && t("fingerprint.splitAlbums", { count: split.ratedAlbums }),
    split.ratedSongs > 0 && t("fingerprint.splitSongs", { count: split.ratedSongs }),
    split.collection > 0 && t("fingerprint.splitCollection", { count: split.collection }),
    split.lists > 0 && t("fingerprint.splitLists", { count: split.lists }),
  ].filter((part): part is string => Boolean(part));

  return (
    <section className="flex w-full max-w-2xl flex-col gap-6">
      <h2 className="font-display text-xl text-paper">{t("fingerprint.heading")}</h2>

      {/* Curva de valoraciones */}
      <div className="flex flex-col gap-2">
        <p className="font-data text-xs uppercase tracking-wide text-paper-muted">
          {t("fingerprint.ratingCurveLabel")}
        </p>
        {ratingCurve ? (
          <RatingCurve
            curve={ratingCurve}
            total={totalRatings}
            caption={t("fingerprint.a11yCurveCaption", { total: totalRatings })}
            starsHeader={t("fingerprint.a11yCurveStars")}
            countHeader={t("fingerprint.a11yCurveCount")}
          />
        ) : (
          <p className="font-body text-sm text-paper-muted">{t("fingerprint.ratingCurveEmpty")}</p>
        )}
      </div>

      {/* Cresta de décadas */}
      {decades.length > 0 && (
        <Ridge
          label={t("fingerprint.decadesLabel")}
          points={decades}
          rowLabel={(point) => t("fingerprint.a11yRidge", { label: point.label, count: point.count })}
        />
      )}

      {/* Cresta de géneros */}
      {genreDataAvailable ? (
        <Ridge
          label={t("fingerprint.genresLabel")}
          points={genres}
          rowLabel={(point) => t("fingerprint.a11yRidge", { label: point.label, count: point.count })}
        />
      ) : (
        <div className="flex flex-col gap-2">
          <p className="font-data text-xs uppercase tracking-wide text-paper-muted">
            {t("fingerprint.genresLabel")}
          </p>
          <p className="font-body text-sm text-paper-muted">{t("fingerprint.genresEmpty")}</p>
        </div>
      )}

      {/* Reparto */}
      {splitParts.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-data text-xs uppercase tracking-wide text-paper-muted">
            {t("fingerprint.splitLabel")}
          </p>
          <p className="flex flex-wrap gap-x-3 gap-y-1 font-data text-xs text-paper-muted">
            {splitParts.map((part, index) => (
              <span key={part}>
                {index > 0 && <span aria-hidden="true" className="mr-3">·</span>}
                {part}
              </span>
            ))}
          </p>
        </div>
      )}
    </section>
  );
}

function RatingCurve({
  curve,
  total,
  caption,
  starsHeader,
  countHeader,
}: {
  curve: { stars: number; count: number }[];
  total: number;
  caption: string;
  starsHeader: string;
  countHeader: string;
}) {
  const max = Math.max(1, ...curve.map((point) => point.count));

  return (
    <>
      <div aria-hidden="true" className="flex h-28 items-end gap-1">
        {curve.map((point) => (
          <div key={point.stars} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-full w-full items-end">
              <div
                className="w-full rounded-t-sm bg-amber"
                style={{ height: `${Math.round((point.count / max) * 100)}%` }}
              />
            </div>
            {Number.isInteger(point.stars) && (
              <span className="font-data text-[0.625rem] text-paper-muted">{point.stars}</span>
            )}
          </div>
        ))}
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{starsHeader}</th>
            <th scope="col">{countHeader}</th>
          </tr>
        </thead>
        <tbody>
          {curve.map((point) => (
            <tr key={point.stars}>
              <th scope="row">{point.stars}</th>
              <td>{point.count}</td>
            </tr>
          ))}
          <tr>
            <th scope="row">Σ</th>
            <td>{total}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

function Ridge({
  label,
  points,
  rowLabel,
}: {
  label?: string;
  points: RidgePoint[];
  rowLabel: (point: RidgePoint) => string;
}) {
  const max = Math.max(1, ...points.map((point) => point.count));

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <p className="font-data text-xs uppercase tracking-wide text-paper-muted">{label}</p>
      )}
      <ul aria-hidden="true" className="flex flex-col gap-1.5">
        {points.map((point) => (
          <li key={point.label} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate font-data text-xs text-paper-muted">
              {point.label}
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-sm bg-ink-surface">
              <span
                className="block h-full rounded-sm bg-paper-muted/45"
                style={{ width: `${Math.round((point.count / max) * 100)}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
      <ul className="sr-only">
        {points.map((point) => (
          <li key={point.label}>{rowLabel(point)}</li>
        ))}
      </ul>
    </div>
  );
}
