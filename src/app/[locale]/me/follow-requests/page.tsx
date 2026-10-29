import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requirePageUser } from "@/services/auth/page-auth";
import { getOwnProfile } from "@/services/social/profiles";
import {
  countPendingFollowRequests,
  countSentRequests,
  listFollowRequestsPage,
  listSentRequestsPage,
} from "@/services/social/following";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { FollowRequestList } from "@/components/social/FollowRequestList";
import { SentRequestList } from "@/components/social/SentRequestList";
import { withFollowRequestContext } from "@/services/social/follow-request-context";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("users");
  return { title: t("requestsTitle") };
}

const EMPTY_LINK =
  "rounded-md border border-ink-border bg-ink-surface px-4 py-2 font-data text-sm text-paper transition-colors hover:border-amber";

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

// Bandeja de solicitudes de seguimiento (openspec: refine-follow-requests-phase1, add-follow-requests-sent-and-bulk):
// migas, cabecera con qué implica aprobar, pestañas Recibidas · Enviadas con sus cifras (`?tab=sent`) y la lista de la
// pestaña activa; sin solicitudes recibidas, un vacío según la privacidad del perfil (D4).
export default async function FollowRequestsPage({ searchParams }: PageProps) {
  const t = await getTranslations("users");
  const user = await requirePageUser();
  const tab = (await searchParams)?.tab === "sent" ? "sent" : "received";
  const [profile, receivedCount, sentCount] = await Promise.all([
    getOwnProfile(user.id),
    countPendingFollowRequests(user.id),
    countSentRequests(user.id),
  ]);
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
        {profile.profileVisibility === "private" || receivedCount > 0 ? (
          <p className="font-body text-sm text-paper-muted">{t("requests.subtitle")}</p>
        ) : null}
      </header>
      <nav aria-label={t("requests.tabsLabel")} className="flex gap-1 border-b border-ink-border">
        {(
          [
            { key: "received", href: "/me/follow-requests", count: receivedCount },
            { key: "sent", href: "/me/follow-requests?tab=sent", count: sentCount },
          ] as const
        ).map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-current={item.key === tab ? "page" : undefined}
            className={`flex min-h-11 items-center gap-1.5 border-b-2 px-3 font-display text-sm transition-colors ${
              item.key === tab ? "border-amber text-paper" : "border-transparent text-paper-muted hover:text-paper"
            }`}
          >
            {t(`requests.tab.${item.key}`)}
            <span className="font-data text-xs text-paper-muted">{item.count}</span>
          </Link>
        ))}
      </nav>
      {tab === "sent" ? (
        <SentRequestList
          key="sent"
          initial={await listSentRequestsPage(user.id)}
          empty={
            <EmptyState
              compact
              title={t("requests.emptySentTitle")}
              description={t("requests.emptySentDescription")}
            />
          }
        />
      ) : (
        <FollowRequestList
          key="received"
          initial={await withFollowRequestContext(user.id, await listFollowRequestsPage(user.id))}
          empty={empty}
        />
      )}
    </main>
  );
}
