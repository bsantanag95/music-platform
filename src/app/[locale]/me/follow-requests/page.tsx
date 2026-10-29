import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requirePageUser } from "@/services/auth/page-auth";
import { getOwnProfile } from "@/services/social/profiles";
import { listFollowRequestsPage } from "@/services/social/following";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { FollowRequestList } from "@/components/social/FollowRequestList";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("users");
  return { title: t("requestsTitle") };
}

const EMPTY_LINK =
  "rounded-md border border-ink-border bg-ink-surface px-4 py-2 font-data text-sm text-paper transition-colors hover:border-amber";

// Bandeja de solicitudes de seguimiento recibidas (openspec: refine-follow-requests-phase1): migas, cabecera con la
// explicación de qué implica aprobar, la lista por fecha y, sin solicitudes, un vacío según la privacidad del perfil (D4).
export default async function FollowRequestsPage() {
  const t = await getTranslations("users");
  const user = await requirePageUser();
  const [profile, page] = await Promise.all([getOwnProfile(user.id), listFollowRequestsPage(user.id)]);
  const name = profile.displayName ?? profile.username;

  const empty =
    profile.profileVisibility === "public" ? (
      <EmptyState
        compact
        title={t("requests.emptyPublicTitle")}
        description={t("requests.emptyPublicDescription")}
        action={
          <Link href="/me/settings/privacy" className={EMPTY_LINK}>
            {t("requests.emptyPublicCta")}
          </Link>
        }
      />
    ) : (
      <EmptyState
        compact
        title={t("emptyRequests")}
        description={t("requests.emptyPrivateDescription")}
        action={
          <Link href={`/users/${profile.username}/connections/followers`} className={EMPTY_LINK}>
            {t("requests.emptyPrivateCta")}
          </Link>
        }
      />
    );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:py-12">
      <Breadcrumbs items={[{ label: name, href: `/users/${profile.username}` }, { label: t("requestsTitle") }]} />
      <header className="-mt-2 flex flex-col gap-1 sm:-mt-4">
        <h1 className="font-display text-3xl text-paper">{t("requestsTitle")}</h1>
        {/* Con perfil público y sin solicitudes, el vacío ya lo explica: "tu perfil privado" lo contradiría. */}
        {profile.profileVisibility === "private" || page.total > 0 ? (
          <p className="font-body text-sm text-paper-muted">{t("requests.subtitle")}</p>
        ) : null}
      </header>
      <FollowRequestList initial={page} empty={empty} />
    </main>
  );
}
