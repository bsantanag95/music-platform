import { useTranslations } from "next-intl";
import type { CommentTopic } from "@/lib/api/schemas";

function TopicText({ topic, className }: { topic: CommentTopic; className?: string }) {
  const t = useTranslations("catalog.social.topics");
  return <span className={className}>{t(topic)}</span>;
}

/**
 * Nombre del tema de un comentario de artista (add-artist-comment-topics) como texto en línea.
 * No renderiza nada si el comentario no tiene tema (álbum, canción o dato anterior al cambio).
 * Se separa en dos componentes para no llamar al hook de i18n cuando no hay tema.
 */
export function CommentTopicLabel({ topic, className }: { topic: CommentTopic | null | undefined; className?: string }) {
  if (!topic) return null;
  return <TopicText topic={topic} className={className} />;
}
