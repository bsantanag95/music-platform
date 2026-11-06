import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { ShareAction } from "@/components/share/ShareAction";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Link } from "@/i18n/navigation";
import { withClientMessages } from "@/i18n/client-messages";
import { isValidUuid } from "@/lib/validation";
import { resolveSession } from "@/services/auth/sessions";
import { buildShareMetadata } from "@/services/share/metadata";
import { getCommentPermalink } from "@/services/social";

// Dirección propia de un comentario raíz (spec comment-permalink): lo que se comparte, porque un ancla no llega al
// servidor y no puede llevar imagen. La conversación sigue viviendo en la página del objeto: acá solo se lee.

interface CommentPageProps {
  params: Promise<{ commentId: string }>;
}

export async function generateMetadata({ params }: CommentPageProps): Promise<Metadata> {
  const { commentId } = await params;
  if (!isValidUuid(commentId)) return {};
  return buildShareMetadata("comment", commentId, await getLocale(), { withTitle: true });
}

async function CommentPage({ params }: CommentPageProps) {
  const { commentId } = await params;
  if (!isValidUuid(commentId)) notFound();

  const session = await resolveSession();
  const permalink = await getCommentPermalink(commentId, session?.user.id ?? null);
  if (!permalink) notFound();
  const { comment, author, object } = permalink;

  const locale = await getLocale();
  // Una respuesta no tiene dirección propia: lleva a su raíz.
  if (comment.id !== commentId) redirect(`/${locale}/comment/${comment.id}`);

  const [t, tCommon, format] = await Promise.all([
    getTranslations("catalog.social.commentPage"),
    getTranslations("common"),
    getFormatter(),
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:py-12">
      <Breadcrumbs
        items={[
          { label: tCommon("home"), href: "/" },
          { label: object.title, href: object.href },
          { label: t("title") },
        ]}
        action={<ShareAction kind="comment" refId={comment.id} />}
      />
      <article className="flex flex-col gap-4">
        <h1 className="font-data text-xs uppercase tracking-wider text-paper-muted">
          <Link href={object.href} className="hover:text-paper hover:underline">
            {t("about", { object: object.title })}
          </Link>
        </h1>
        <p className="flex flex-wrap items-baseline gap-x-3 font-data text-xs text-paper-muted">
          <Link href={`/users/${author.username}`} className="text-paper hover:underline">
            {author.displayName ?? author.username}
          </Link>
          <time dateTime={comment.createdAt}>{format.dateTime(new Date(comment.createdAt), { dateStyle: "long" })}</time>
        </p>
        <p className="whitespace-pre-wrap font-body text-lg text-paper">{comment.body}</p>
        <Link
          href={`${object.href}?thread=${comment.id}`}
          className="w-fit font-data text-sm text-amber underline-offset-4 hover:underline"
        >
          {t("viewConversation")}
        </Link>
      </article>
    </main>
  );
}

export default withClientMessages("comment/[commentId]/page", CommentPage);
