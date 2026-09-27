import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { TrackCreditPerson } from "@/services/catalog/personnel-levels";
import { messageKey } from "@/components/album/credit-roles";

// Autores de la obra de una grabación (openspec: add-songwriter-credits; en la ficha técnica
// de la canción desde redesign-song-page): enlazados, con el rol entre paréntesis cuando no
// es `writer` ("música", "letra"). Sin autores no se muestra nada.

/**
 * ¿Todos los autores tienen los mismos roles? Entonces el rol no aporta: se omite en la ficha
 * y el bloque Composición no se muestra (openspec: polish-song-header).
 */
export function songwritersShareRoles(songwriters: TrackCreditPerson[]): boolean {
  const keys = songwriters.map((person) => [...new Set(person.roles.map((r) => r.relationType))].sort().join("|"));
  return new Set(keys).size <= 1;
}

export function SongwriterNames({
  songwriters,
  showRoles = !songwritersShareRoles(songwriters),
}: {
  songwriters: TrackCreditPerson[];
  /** Por defecto, solo si los roles difieren entre autores. */
  showRoles?: boolean;
}) {
  const tCredits = useTranslations("catalog.album.credits");
  if (songwriters.length === 0) return null;

  const roleLabel = (relationType: string) => {
    const key = `roles.${messageKey(relationType)}`;
    return tCredits.has(key) ? tCredits(key) : relationType;
  };

  return (
    <>
      {songwriters.map((person, index) => {
        const roles = showRoles
          ? [...new Set(person.roles.filter((r) => r.relationType !== "writer").map((r) => roleLabel(r.relationType)))]
          : [];
        return (
          <Fragment key={person.artistId}>
            {index > 0 && ", "}
            <Link href={`/artist/${person.artistId}`} className="text-amber hover:text-amber-hover hover:underline">
              {person.name}
            </Link>
            {roles.length > 0 && <span className="text-paper-muted"> ({roles.join(", ")})</span>}
          </Fragment>
        );
      })}
    </>
  );
}
