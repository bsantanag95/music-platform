import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROLES_VISIBLE, useRoleFormatter } from "@/components/album/AlbumCredits";
import { SongwriterNames, songwritersShareRoles } from "@/components/catalog/SongwriterNames";
import type { RecordingCredits, TrackCreditKind, TrackCreditPerson } from "@/services/catalog/personnel-levels";
import { ExpandableRoles } from "./ExpandableRoles";
import { orderSound, splitMembers } from "./song-credits";

// Bloques Composición y Créditos de esta grabación (openspec: redesign-song-page, design D6;
// una persona por fila desde polish-song-credits-strip): los mismos roles traducidos que los
// créditos del álbum. La composición va aparte porque en la canción la obra es lo que une a sus
// versiones.

const blockClass = "flex min-w-0 flex-col gap-2 rounded border border-ink-border bg-ink-surface px-4 py-3";
const headingClass = "font-data text-xs uppercase tracking-wider text-paper-muted";

/** El bloque Composición solo aparece cuando agrega algo: roles distintos entre autores. */
export function hasCompositionBlock(credits: RecordingCredits): boolean {
  const songwriters = credits.groups.songwriting;
  return songwriters.length > 0 && !songwritersShareRoles(songwriters);
}

export function SongComposition({ credits }: { credits: RecordingCredits }) {
  const t = useTranslations("catalog.song");
  if (!hasCompositionBlock(credits)) return null;
  return (
    <section aria-labelledby="song-composition" className={blockClass}>
      <h2 id="song-composition" className={headingClass}>
        {t("composition")}
      </h2>
      <p className="font-body text-sm text-paper">
        <SongwriterNames songwriters={credits.groups.songwriting} showRoles />
      </p>
    </section>
  );
}

const RECORDING_KINDS = ["performers", "production", "sound", "other"] as const satisfies TrackCreditKind[];
const REST_KINDS = ["production", "sound", "other"] as const satisfies TrackCreditKind[];

/** El bloque de créditos aparece con créditos propios o con enlace a los del disco. */
export function hasRecordingCreditsBlock(credits: RecordingCredits, principalReleaseGroupId: string | null): boolean {
  return (
    RECORDING_KINDS.some((kind) => credits.groups[kind].length > 0) ||
    (credits.hasAlbumWideCredits && principalReleaseGroupId !== null)
  );
}

/** Una persona por fila: nombre a un lado, roles al otro, con "+N" si son muchos. */
function PersonRow({ kind, person, prominent }: { kind: TrackCreditKind; person: TrackCreditPerson; prominent: boolean }) {
  const format = useRoleFormatter();
  // Producción ya dice "producción": ese rol sin matices no se repite en la fila.
  const roles = format(
    kind === "production"
      ? person.roles.filter((r) => !(r.relationType === "producer" && r.attributes.length === 0))
      : person.roles,
  );
  // Esconder un solo rol no ahorra espacio: "+N" solo con 2 o más ocultos (como en el álbum).
  const collapse = roles.length > ROLES_VISIBLE + 1;
  const visible = collapse ? roles.slice(0, ROLES_VISIBLE) : roles;
  const hidden = collapse ? roles.slice(ROLES_VISIBLE) : [];

  return (
    <li className="grid grid-cols-1 gap-x-4 gap-y-0.5 py-1.5 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:items-baseline">
      <Link
        href={`/artist/${person.artistId}`}
        className={`min-w-0 hover:text-amber hover:underline ${prominent ? "font-display text-paper" : "font-body text-sm text-paper"}`}
      >
        {person.name}
      </Link>
      <div className="min-w-0 font-data text-xs text-paper-muted">
        <ExpandableRoles visible={visible} hidden={hidden} />
      </div>
    </li>
  );
}

function PeopleList({ kind, people, prominent = false }: { kind: TrackCreditKind; people: TrackCreditPerson[]; prominent?: boolean }) {
  return (
    <ul className="flex flex-col">
      {people.map((person) => (
        <PersonRow key={person.artistId} kind={kind} person={person} prominent={prominent} />
      ))}
    </ul>
  );
}

function CreditGroup({ kind, credits }: { kind: TrackCreditKind; credits: RecordingCredits }) {
  const t = useTranslations("catalog.album.credits");
  const tSong = useTranslations("catalog.song");
  const people = credits.groups[kind];
  if (people.length === 0) return null;

  let body: React.ReactNode;
  if (kind === "performers") {
    // Integrantes primero, con la tipografía destacada del álbum, y un filete hasta los invitados.
    const { members, guests } = splitMembers(people, new Set(credits.memberIds));
    body = (
      <>
        {members.length > 0 && <PeopleList kind={kind} people={members} prominent />}
        {members.length > 0 && guests.length > 0 && <hr className="my-1 border-ink-border" />}
        {guests.length > 0 && <PeopleList kind={kind} people={guests} />}
      </>
    );
  } else if (kind === "sound") {
    const { main, assistants } = orderSound(people);
    body = (
      <>
        <PeopleList kind={kind} people={main} />
        {assistants.length > 0 && (
          <details className="group/assistants">
            <summary className="cursor-pointer list-none py-1.5 font-data text-xs text-amber hover:underline [&::-webkit-details-marker]:hidden">
              <span className="group-open/assistants:hidden">{tSong("assistants", { count: assistants.length })}</span>
              <span className="hidden group-open/assistants:inline">{tSong("hideAssistants")}</span>
            </summary>
            <PeopleList kind={kind} people={assistants} />
          </details>
        )}
      </>
    );
  } else {
    body = <PeopleList kind={kind} people={people} />;
  }

  return (
    <section aria-label={t(`groups.${kind}`)} className="flex min-w-0 flex-col">
      <h3 className="border-b border-ink-border pb-1 font-data text-xs text-paper-muted">{t(`groups.${kind}`)}</h3>
      {body}
    </section>
  );
}

export function SongRecordingCredits({
  credits,
  principalReleaseGroupId,
}: {
  credits: RecordingCredits;
  principalReleaseGroupId: string | null;
}) {
  const t = useTranslations("catalog.song");
  if (!hasRecordingCreditsBlock(credits, principalReleaseGroupId)) return null;
  const albumLink = credits.hasAlbumWideCredits && principalReleaseGroupId;
  const hasPerformers = credits.groups.performers.length > 0;
  const hasRest = REST_KINDS.some((kind) => credits.groups[kind].length > 0);

  return (
    <section aria-labelledby="song-credits" className={blockClass}>
      <h2 id="song-credits" className={headingClass}>
        {t("recordingCredits")}
      </h2>
      {/* Intérpretes a la izquierda y el resto apilado a la derecha: se leen en orden. */}
      <div className={`grid grid-cols-1 gap-x-8 gap-y-4 ${hasPerformers && hasRest ? "lg:grid-cols-2" : ""}`}>
        {hasPerformers && <CreditGroup kind="performers" credits={credits} />}
        {hasRest && (
          <div className="flex min-w-0 flex-col gap-4">
            {REST_KINDS.map((kind) => (
              <Fragment key={kind}>
                <CreditGroup kind={kind} credits={credits} />
              </Fragment>
            ))}
          </div>
        )}
      </div>
      {albumLink && (
        <Link href={`/album/${principalReleaseGroupId}/credits`} className="self-start font-data text-xs text-amber hover:underline">
          {t("albumWideCredits")} →
        </Link>
      )}
    </section>
  );
}
