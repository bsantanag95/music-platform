import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getRecordingDetail } from "@/services/catalog/recording-detail";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { isValidUuid } from "@/lib/validation";
import { RecordingDetailSchema } from "@/lib/api/schemas";
import { SocialSection } from "@/components/social/SocialSection";
import { MarkAsListened } from "@/components/diary/MarkAsListened";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { AddToListButton } from "@/components/lists/AddToListButton";
import { resolveSession } from "@/services/auth/sessions";
import { getRatings, listComments, resolveSocialTarget } from "@/services/social";

interface SongPageProps { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: SongPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isValidUuid(id)) return {};
  const result = await getRecordingDetail(id);
  return result.kind === "ok" ? { title: result.detail.recording.title } : {};
}

function formatDuration(seconds: number | null, unknown: string) { if (seconds === null) return unknown; return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }

export default async function SongPage({ params }: SongPageProps) {
  const { id } = await params;
  const t = await getTranslations("catalog");
  const common = await getTranslations("common");
  if (!isValidUuid(id)) notFound();
  const result = await getRecordingDetail(id);
  if (result.kind === "not_found") notFound();
  const detail = RecordingDetailSchema.parse({
    recording: { ...result.detail.recording, variantType: result.detail.recording.variantType },
    credits: result.detail.credits,
    appearances: result.detail.appearances,
    primaryArtist: result.detail.primaryArtist,
  });
  const session = await resolveSession();
  const socialTarget = await resolveSocialTarget("recording", detail.recording.id);
  const [ratings, comments] = await Promise.all([
    getRatings(socialTarget, session?.user.id),
    listComments(socialTarget),
  ]);
  const firstAppearance = detail.appearances[0];
  const breadcrumbItems = [
    { label: common("home"), href: "/" },
    ...(detail.primaryArtist
      ? [{ label: detail.primaryArtist.name, href: `/artist/${detail.primaryArtist.id}` }]
      : []),
    ...(firstAppearance
      ? [{ label: firstAppearance.albumTitle, href: `/album/${firstAppearance.releaseGroupId}` }]
      : []),
    { label: detail.recording.title },
  ];

  return <main className="flex min-h-screen flex-col items-start gap-8 px-4 py-12"><Breadcrumbs items={breadcrumbItems} /><header><p className="font-data text-xs uppercase tracking-wider text-paper-muted">{t("song.variant")}: {detail.recording.variantType}</p><h1 className="font-display text-4xl text-paper">{detail.recording.title}</h1><p className="mt-2 font-data text-sm text-paper-muted">{t("song.duration")}: {formatDuration(detail.recording.durationSec, t("song.durationUnknown"))}</p></header><div className="flex flex-col items-start gap-3"><MarkAsListened target={{ type: "recording", id: detail.recording.id }} authenticated={Boolean(session?.user.id)} /><FavoriteButton target={{ type: "recording", id: detail.recording.id }} authenticated={Boolean(session?.user.id)} /><AddToListButton target={{ type: "recording", id: detail.recording.id }} authenticated={Boolean(session?.user.id)} /></div><section className="flex w-full flex-col gap-3"><h2 className="font-display text-xl text-paper">{t("song.creditsHeading")}</h2><ul className="flex flex-col gap-2">{detail.credits.map((credit) => <li key={`${credit.artistId}-${credit.role}`} className="font-body text-paper">{credit.role}: <Link href={`/artist/${credit.artistId}`} className="hover:text-accent">{credit.name}</Link>{credit.joinPhrase}</li>)}</ul></section><section className="flex w-full flex-col gap-3"><h2 className="font-display text-xl text-paper">{t("song.appearancesHeading")}</h2><ul className="flex flex-col gap-2">{detail.appearances.map((appearance) => <li key={`${appearance.releaseId}-${appearance.discNumber}-${appearance.position}`} className="font-body text-paper"><Link href={`/album/${appearance.releaseGroupId}`} className="hover:text-accent">{appearance.albumTitle}</Link><span className="ml-3 font-data text-xs text-paper-muted">{t("song.appearancePosition", { disc: appearance.discNumber, position: appearance.position })}</span></li>)}</ul></section><SocialSection target="recording" targetId={detail.recording.id} ratings={ratings} comments={comments} userId={session?.user.id} /></main>;
}
