import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { DiscographyCurve } from "@/components/laminas/DiscographyCurve";
import { ProgressBar } from "@/components/progress/ProgressBar";
import { OwnShareButton } from "@/components/share/OwnShareSheet";
import { ShareAction } from "@/components/share/ShareAction";
import { Link } from "@/i18n/navigation";
import { withClientMessages } from "@/i18n/client-messages";
import { albumHref, artistHref } from "@/lib/catalog-links";
import { scaleScore } from "@/lib/share/score-scale";
import { isValidUuid } from "@/lib/validation";
import { resolveSession } from "@/services/auth/sessions";
import { getDiscographyLamina } from "@/services/laminas/discography";
import { buildShareMetadata } from "@/services/share/metadata";
import { discographyRef, discographyRefFor } from "@/services/share/targets/discography";

// Discografía de una persona con un artista (spec discography-laminas): una Lámina derivada, sin editor. La ven el dueño y sus
// seguidores; a los demás se la abre solo su marca, y sin marca responde 404 sin decir por qué.

interface PageProps {
  params: Promise<{ username: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username, id } = await params;
  const ref = isValidUuid(id) ? await discographyRefFor(username, id) : null;
  return ref ? buildShareMetadata("discography", ref, await getLocale(), { withTitle: true }) : {};
}

async function UserDiscographyPage({ params }: PageProps) {
  const { username, id } = await params;
  const session = await resolveSession();
  const lamina = await getDiscographyLamina(username, id, session?.user.id ?? null);
  if (!lamina) notFound();

  const t = await getTranslations("laminas.discography");
  const ref = discographyRef(lamina.owner.id, lamina.artist.id);
  const { progress } = lamina;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/users/${encodeURIComponent(lamina.owner.username)}`} className="font-data text-xs text-paper-muted hover:text-paper">
          @{lamina.owner.username}
        </Link>
        {lamina.missing > 0 ? null : lamina.isOwner ? <OwnShareButton kind="discography" refId={ref} /> : lamina.shared ? <ShareAction kind="discography" refId={ref} /> : null}
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
      {lamina.missing > 0 ? (
        <p className="font-body text-sm text-paper-muted">{t("missing", { count: lamina.missing })}</p>
      ) : (
        <DiscographyCurve discs={lamina.discs} />
      )}
      <ol className="flex flex-col gap-2">
        {lamina.discs.map((disc) => {
          const score = scaleScore(disc);
          return (
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
                <span className="rounded px-2 py-0.5 font-data text-sm" style={{ backgroundColor: score.band.background, color: score.band.foreground }}>
                  {score.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </main>
  );
}

export default withClientMessages("users/[username]/artist/[id]/page", UserDiscographyPage);
