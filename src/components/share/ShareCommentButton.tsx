"use client";

import { useLocale, useTranslations } from "next-intl";
import { commentSharePayload } from "@/lib/share/comment-payload";
import { ShareButton } from "./ShareButton";

// Compartir desde la fila de un comentario raíz (spec share-sheet): lleva a su dirección propia.
export function ShareCommentButton({ commentId, username }: { commentId: string; username: string }) {
  const t = useTranslations("share");
  const locale = useLocale();
  const title = t("commentTitle", { author: `@${username}` });
  return <ShareButton compact payload={commentSharePayload({ commentId, locale, title, username })} />;
}
