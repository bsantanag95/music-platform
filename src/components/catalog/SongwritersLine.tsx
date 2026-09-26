import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { TrackCreditPerson } from "@/services/catalog/personnel-levels";
import { messageKey } from "@/components/album/credit-roles";

// Línea "Escrita por" de la página de canción (openspec: add-songwriter-credits, capability
// `catalog-song`): los autores de la obra de la grabación, enlazados, con el rol entre
// paréntesis cuando no es `writer` ("música", "letra"). Sin autores no se muestra.

export function SongwritersLine({ songwriters }: { songwriters: TrackCreditPerson[] }) {
  const t = useTranslations("catalog.song");
  const tCredits = useTranslations("catalog.album.credits");
  if (songwriters.length === 0) return null;

  const roleLabel = (relationType: string) => {
    const key = `roles.${messageKey(relationType)}`;
    return tCredits.has(key) ? tCredits(key) : relationType;
  };

  return (
    <p className="font-data text-xs text-paper-muted">
      {t("writtenBy")}{" "}
      {songwriters.map((person, index) => {
        const roles = [...new Set(person.roles.filter((r) => r.relationType !== "writer").map((r) => roleLabel(r.relationType)))];
        return (
          <Fragment key={person.artistId}>
            {index > 0 && ", "}
            <Link href={`/artist/${person.artistId}`} className="text-paper hover:text-amber hover:underline">
              {person.name}
            </Link>
            {roles.length > 0 && ` (${roles.join(", ")})`}
          </Fragment>
        );
      })}
    </p>
  );
}
