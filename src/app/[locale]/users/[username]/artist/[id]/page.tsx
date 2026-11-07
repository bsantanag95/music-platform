import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { DiscographyCurve } from "@/components/laminas/DiscographyCurve";
import { DiscographySettings } from "@/components/laminas/DiscographySettings";
import { LaminaCta } from "@/components/laminas/LaminaCta";
import { RateInline } from "@/components/laminas/RateInline";
import { ScoreBadge } from "@/components/laminas/ScoreBadge";
import { ProgressBar } from "@/components/progress/ProgressBar";
import { OwnShareButton } from "@/components/share/OwnShareSheet";
import { ShareAction } from "@/components/share/ShareAction";
import { Link } from "@/i18n/navigation";
import { withClientMessages } from "@/i18n/client-messages";
import { albumHref, artistHref, songHref } from "@/lib/catalog-links";
import { DISCOGRAPHY_ALBUM_MIN_SONGS, effectiveView, type DiscographyView } from "@/lib/laminas/discography";
import { discographyBuildHref } from "@/lib/laminas/intent";
import { scaleScore } from "@/lib/share/score-scale";
import { isValidUuid } from "@/lib/validation";
import { resolveSession } from "@/services/auth/sessions";
import { getDiscographyAlbum, getDiscographyLamina, type DiscographyLamina } from "@/services/laminas/discography";
import { buildShareMetadata } from "@/services/share/metadata";
import { discographyRef, discographyRefFor } from "@/services/share/targets/discography";

// Discografía de una persona con un artista (spec discography-laminas): una Lámina derivada, sin editor, con dos vistas y la Lámina
// de cada álbum. La ven el dueño y sus seguidores; a los demás se la abre solo su marca, y sin marca responde 404 sin decir por qué.

interface PageProps {
  params: Promise<{ username: string; id: string }>;
  searchParams?: Promise<{ vista?: string; disco?: string; valorar?: string }>;
}

const VIEW_PARAM: Record<string, DiscographyView> = { disco: "disc", canciones: "song" };
const PARAM_OF: Record<DiscographyView, string> = { disc: "disco", song: "canciones" };

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { username, id } = await params;
  const { disco } = (await searchParams) ?? {};
  const album = typeof disco === "string" && isValidUuid(disco) ? disco : undefined;
  const ref = isValidUuid(id) ? await discographyRefFor(username, id, album) : null;
  return ref ? buildShareMetadata("discography", ref, await getLocale(), { withTitle: true }) : {};
}

function ShareButtonFor({ lamina, refId }: { lamina: DiscographyLamina; refId: string }) {
  if (lamina.missing > 0) return null;
  if (lamina.isOwner) return <OwnShareButton kind="discography" refId={refId} />;
  return lamina.shared ? <ShareAction kind="discography" refId={refId} /> : null;
}

async function UserDiscographyPage({ params, searchParams }: PageProps) {
  const { username, id } = await params;
  const { vista, disco, valorar } = (await searchParams) ?? {};
  const session = await resolveSession();
  const viewer = session?.user.id ?? null;
  const t = await getTranslations("laminas.discography");
  const base = `/users/${encodeURIComponent(username)}/artist/${id}`;

  if (typeof disco === "string") {
    const album = await getDiscographyAlbum(username, id, disco, viewer);
    if (!album) notFound();
    const { lamina, disc } = album;
    const ref = discographyRef(lamina.owner.id, lamina.artist.id, disc.id);
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={base} className="font-data text-xs text-paper-muted hover:text-paper">
            {t("album.back", { artist: lamina.artist.name })}
          </Link>
          {album.missing > 0 ? null : <ShareButtonFor lamina={lamina} refId={ref} />}
        </div>
        <header className="flex items-center gap-4">
          <CoverThumb cover={disc.coverThumbUrl} label="" className="size-24 shrink-0 rounded" />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="font-data text-xs uppercase tracking-wider text-paper-muted">
              @{lamina.owner.username} · {disc.year ?? t("noYear")}
            </p>
            <h1 className="font-display text-2xl text-paper">
              <Link href={albumHref(lamina.artist.name, disc.title, disc.id)} className="transition-colors hover:text-amber">
                {disc.title}
              </Link>
            </h1>
            {disc.score ? <ScoreBadge score={disc.score} className="self-start" /> : null}
          </div>
        </header>
        {album.missing > 0 ? (
          <p className="font-body text-sm text-paper-muted">{t("album.missing", { count: album.missing, min: DISCOGRAPHY_ALBUM_MIN_SONGS })}</p>
        ) : (
          <div aria-hidden="true" className="flex h-40 items-end gap-1">
            {disc.tracks.map((track) => {
              const value = track.score ? (track.score.detailedScore ?? track.score.stars * 20) : 0;
              return (
                <div
                  key={track.number}
                  className={`flex-1 rounded-sm ${track.score ? "" : "border border-ink-border"}`}
                  style={track.score ? { height: `${Math.max(value, 6)}%`, backgroundColor: scaleScore(track.score).band.background } : { height: "6%" }}
                />
              );
            })}
          </div>
        )}
        <ol className="flex flex-col divide-y divide-ink-border rounded border border-ink-border">
          {disc.tracks.map((track) => (
            <li key={track.number} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
              <span className="w-6 text-right font-data text-xs text-paper-muted">{track.number}</span>
              <Link
                href={songHref(lamina.artist.name, track.title, track.recordingId)}
                className="min-w-0 flex-1 truncate font-body text-sm text-paper transition-colors hover:text-amber"
              >
                {track.title}
              </Link>
              {track.score ? (
                <ScoreBadge score={track.score} />
              ) : lamina.isOwner ? (
                <div className="basis-full pl-9">
                  <RateInline target="recording" id={track.recordingId} title={track.title} />
                </div>
              ) : (
                <span className="font-data text-xs text-paper-muted">{t("grid.empty")}</span>
              )}
            </li>
          ))}
        </ol>
      </main>
    );
  }

  const lamina = await getDiscographyLamina(username, id, viewer);
  if (!lamina) notFound();
  const ref = discographyRef(lamina.owner.id, lamina.artist.id);
  const requested = typeof vista === "string" ? VIEW_PARAM[vista] : undefined;
  const view = requested ? effectiveView(requested, lamina.available) : lamina.view;
  const { progress } = lamina;
  const longest = Math.max(0, ...lamina.songDiscs.map((disc) => disc.tracks.length));
  const unrated = lamina.ownerDiscs.filter((disc) => !disc.score);
  const rating = lamina.isOwner && valorar === "1";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/users/${encodeURIComponent(lamina.owner.username)}`} className="font-data text-xs text-paper-muted hover:text-paper">
          @{lamina.owner.username}
        </Link>
        <ShareButtonFor lamina={lamina} refId={ref} />
      </div>
      <header className="flex flex-col gap-2">
        <p className="font-data text-xs uppercase tracking-wider text-paper-muted">{t("kicker")}</p>
        <h1 className="font-display text-3xl text-paper">
          <Link href={artistHref(lamina.artist.name, lamina.artist.id)} className="transition-colors hover:text-amber">
            {lamina.artist.name}
          </Link>
        </h1>
        {progress.kind === "journey" ? (
          <ProgressBar listened={progress.percent} selected={100} className="w-40" />
        ) : (
          <p className="font-data text-xs text-paper-muted">{t("rated", { count: progress.count })}</p>
        )}
      </header>

      {rating ? (
        <section className="flex flex-col gap-3">
          <header className="flex flex-wrap items-end justify-between gap-2">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-lg text-paper">{t("rate.title")}</h2>
              <p className="font-body text-sm text-paper-muted">{t("rate.description")}</p>
            </div>
            <Link href={base} className="font-data text-xs text-amber hover:underline">
              {t("rate.done")}
            </Link>
          </header>
          {unrated.length === 0 ? (
            <p className="font-body text-sm text-paper-muted">{t("rate.none")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-ink-border rounded border border-ink-border">
              {unrated.map((disc) => (
                <li key={disc.id} className="flex flex-col gap-2 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <CoverThumb cover={disc.coverThumbUrl} label="" className="size-12 shrink-0 rounded" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-display text-sm text-paper">{disc.title}</span>
                      <span className="font-data text-xs text-paper-muted">
                        {disc.year ?? t("noYear")} ·{" "}
                        <Link href={`${base}?disco=${disc.id}`} className="hover:text-amber">
                          {t("rate.songs")}
                        </Link>
                      </span>
                    </span>
                  </div>
                  <RateInline target="release-group" id={disc.id} title={disc.title} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {!rating && lamina.isOwner && unrated.length > 0 ? (
        <Link href={`${base}?valorar=1`} className="self-start rounded border border-amber px-3 py-1.5 font-display text-sm text-amber transition-colors hover:bg-amber hover:text-ink">
          {t("rateMissing", { count: unrated.length })}
        </Link>
      ) : null}

      {rating ? null : lamina.available.disc && lamina.available.song ? (
        <nav aria-label={t("views.label")} className="flex gap-1 self-start rounded border border-ink-border p-0.5">
          {(["disc", "song"] as const).map((option) => (
            <Link
              key={option}
              href={`${base}?vista=${PARAM_OF[option]}`}
              aria-current={view === option ? "page" : undefined}
              className={`rounded px-3 py-1 font-data text-xs transition-colors ${view === option ? "bg-ink-border text-paper" : "text-paper-muted hover:text-paper"}`}
            >
              {t(`views.${option}`)}
            </Link>
          ))}
        </nav>
      ) : null}

      {lamina.isOwner && !rating ? <DiscographySettings artistId={lamina.artist.id} initial={lamina.preference} /> : null}

      {rating ? null : lamina.missing > 0 ? (
        <p className="font-body text-sm text-paper-muted">{t("missing", { count: lamina.missing })}</p>
      ) : view === "song" ? (
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-1 font-data text-xs">
            <caption className="sr-only">{t("grid.caption", { artist: lamina.artist.name })}</caption>
            <thead>
              <tr>
                <th scope="col" className="sr-only">
                  {t("grid.track")}
                </th>
                {lamina.songDiscs.map((disc) => (
                  <th key={disc.id} scope="col" className="w-14 align-bottom font-normal">
                    <Link href={`${base}?disco=${disc.id}`} className="flex flex-col items-center gap-1 text-paper-muted transition-colors hover:text-amber">
                      <CoverThumb cover={disc.coverThumbUrl} label="" className="size-12 rounded" />
                      <span className="line-clamp-2 w-14 text-center text-[11px] leading-tight text-paper">{disc.title}</span>
                      <span>{disc.year ?? "—"}</span>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" className="pr-1 text-right font-normal text-paper-muted">
                  {t("grid.disc")}
                </th>
                {lamina.songDiscs.map((disc) => (
                  <td key={disc.id} className="text-center">
                    {disc.score ? <ScoreBadge score={disc.score} className="w-full" /> : <span className="sr-only">{t("grid.empty")}</span>}
                  </td>
                ))}
              </tr>
              {Array.from({ length: longest }, (_, index) => (
                <tr key={index}>
                  <th scope="row" className="pr-1 text-right font-normal text-paper-muted">
                    {index + 1}
                  </th>
                  {lamina.songDiscs.map((disc) => {
                    const track = disc.tracks[index];
                    return (
                      <td key={disc.id} className="h-7 rounded border border-ink-border text-center" title={track?.title}>
                        {track?.score ? <ScoreBadge score={track.score} className="w-full" /> : <span className="sr-only">{track ? t("grid.empty") : ""}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <DiscographyCurve discs={lamina.discs} />
          <ol className="flex flex-col gap-2">
            {lamina.discs.map((disc) => (
              <li key={disc.id}>
                <Link
                  href={albumHref(lamina.artist.name, disc.title, disc.id)}
                  className="flex items-center gap-3 rounded border border-ink-border bg-ink-surface p-2 transition-colors hover:border-amber"
                >
                  <CoverThumb cover={disc.coverThumbUrl} label="" className="size-14 shrink-0 rounded" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-display text-sm text-paper">{disc.title}</span>
                    <span className="font-data text-xs text-paper-muted">{disc.year ?? t("noYear")}</span>
                  </span>
                  <ScoreBadge score={disc} className="text-sm" />
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}
      {lamina.isOwner ? null : (
        <LaminaCta
          intent={{ kind: "discography", artistId: lamina.artist.id }}
          signedInHref={session ? discographyBuildHref(session.user.username, lamina.artist.id) : null}
          title={t("cta.title", { artist: lamina.artist.name })}
          description={t("cta.description")}
        />
      )}
    </main>
  );
}

export default withClientMessages("users/[username]/artist/[id]/page", UserDiscographyPage);
