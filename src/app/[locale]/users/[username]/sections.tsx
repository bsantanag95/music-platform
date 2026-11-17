import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { genreLocaleOf } from "@/services/genres/names";
import { identityGenreLabels } from "@/services/genres/read";
import { listUserDiary } from "@/services/diary/diary";
import { getFavoritesPreview } from "@/services/favorites/favorites";
import { listUserLists } from "@/services/lists/lists";
import { listVisibleCaminos } from "@/services/camino/camino";
import { getCollectionPreview } from "@/services/collection/collection";
import { getConcertPreview } from "@/services/concerts/concerts";
import { getTasteFingerprint } from "@/services/profiles/stats";
import { getShowcase } from "@/services/profiles/showcase";
import { getProfileInRotation } from "@/services/profiles/in-rotation";
import { getProfileReviews } from "@/services/profiles/reviews";
import { listProfileFollowedArtists } from "@/services/profiles/exploration";
import { getProfileRecency } from "@/services/profiles/recency";
import { getProfileAffinity } from "@/services/profiles/affinity";
import { getProfileRatingHighlights } from "@/services/rating-highlights/rating-highlights";
import { countPendingFollowRequests } from "@/services/social/following";
import type { ProfileView } from "@/services/profiles/profile-view";
import { ProfileAffinity } from "@/components/profiles/ProfileAffinity";
import { OwnerSettingsCard } from "@/components/profiles/OwnerSettingsCard";
import { EditableBlock } from "@/components/profiles/EditableBlock";
import { OwnerAvatarEditor } from "@/components/profiles/OwnerAvatarEditor";
import { OwnerIdentityEditor } from "@/components/profiles/OwnerIdentityEditor";
import { OwnerLinksEditor } from "@/components/profiles/OwnerLinksEditor";
import { OwnerMusicIdentityEditor } from "@/components/profiles/OwnerMusicIdentityEditor";
import { OwnerPromptsEditor } from "@/components/profiles/OwnerPromptsEditor";
import { OwnerShowcaseEditor } from "@/components/profiles/OwnerShowcaseEditor";
import { OwnerIdentityCardEditor } from "@/components/profiles/OwnerIdentityCardEditor";
import { IdentityStrip } from "@/components/profiles/IdentityStrip";
import { ProfileAnchors, type ProfileAnchor } from "@/components/profiles/ProfileAnchors";
import { ProfileReviews } from "@/components/profiles/ProfileReviews";
import { RatingHighlights } from "@/components/profiles/RatingHighlights";
import { InRotation } from "@/components/profiles/InRotation";
import { PinnedShowcase } from "@/components/profiles/PinnedShowcase";
import { IdentityCard } from "@/components/profiles/IdentityCard";
import { ProfileRail } from "@/components/profiles/ProfileRail";
import { ProfileRecency } from "@/components/profiles/ProfileRecency";
import { DiaryPreviewTable } from "@/components/diary/DiaryPreviewTable";
import { FavoritesPreview } from "@/components/favorites/FavoritesPreview";
import { ListsAndCaminosPreview, LISTS_AND_CAMINOS_PREVIEW } from "@/components/profiles/ListsAndCaminosPreview";
import { ProfileRow } from "@/components/profiles/ProfileRow";
import { CollectionPreview } from "@/components/collection/CollectionPreview";
import { ConcertsPreview } from "@/components/concerts/ConcertsPreview";
import { FollowersOnlyNote } from "@/components/profiles/FollowersOnlyNote";
import { profileHasVisibleContent } from "@/services/profiles/visible-content";

// Secciones asíncronas del perfil, cada una envuelta por su propio <Suspense>
// en `page.tsx` para que nada bloquee la cabecera. Un estante colapsa cuando no
// tiene contenido visible y el visitante no es el dueño (spec social-profiles,
// "Estante de contenido vacío"); el dueño ve el estante vacío para agregar.

export interface SectionProps {
  username: string;
  viewerId: string | null;
  isOwn: boolean;
}

function EmptyRailForOwner({ label, message }: { label: string; message: string }) {
  return (
    <ProfileRail label={label}>
      <p className="font-body text-sm text-paper-muted">{message}</p>
    </ProfileRail>
  );
}

// Tarjeta de acceso al área de ajustes (reemplaza al panel de atajos).
export async function SettingsCardSection({ ownerId }: { ownerId: string }) {
  return <OwnerSettingsCard pendingRequests={await countPendingFollowRequests(ownerId)} />;
}

// Los bloques visibles del perfil que el dueño puede editar sobre el propio
// perfil se envuelven en `EditableBlock` solo cuando `isOwn` (el dueño real, no
// en previsualización): el lápiz y el panel lateral pertenecen al modo edición
// (spec profile-edit-mode). Para el resto de visitantes la sección es la de
// siempre. El `editor` se construye acá, en el servidor, con su `initial`.

// Los datos de la persona en la cabecera (bio, pronombres, país, ciudad o región, zona
// horaria, enlaces) y la ficha musical de la franja de identidad (roles, géneros,
// formatos y preguntas): todo se edita en un mismo panel, el que antes abría la Placa.
export async function EditablePlaca({
  profile,
  className,
  children,
}: {
  profile: ProfileView;
  className?: string;
  children: ReactNode;
}) {
  const t = await getTranslations("users");
  const genreLabels = await identityGenreLabels(profile.genres, genreLocaleOf(await getLocale()));
  return (
    <EditableBlock
      label={t("editMode.placa")}
      className={className}
      editor={
        <div className="flex flex-col gap-6">
          <OwnerAvatarEditor
            username={profile.username}
            name={profile.displayName ?? profile.username}
            initialAvatarUrl={profile.avatarUrl}
          />
          <OwnerIdentityEditor
            name={profile.displayName ?? profile.username}
            initial={{
              bio: profile.bio,
              pronouns: profile.pronouns,
              pronounSet: profile.pronounSet,
              country: profile.country,
              location: profile.location,
              timezone: profile.timezone,
              showLocalTime: profile.showLocalTime,
            }}
          />
          <OwnerMusicIdentityEditor
            initial={{
              selfRoles: profile.selfRoles,
              genres: profile.genres.filter((slug) => slug in genreLabels),
              listeningFormats: profile.listeningFormats,
            }}
            genreLabels={genreLabels}
          />
          <OwnerPromptsEditor initial={profile.prompts} />
          <OwnerLinksEditor initialLinks={profile.links} />
        </div>
      }
    >
      {children}
    </EditableBlock>
  );
}

// "En rotación": qué está sonando últimamente, derivado del diario. Se rinde
// en los niveles autorizado y dueño, entre "Empieza por aquí" y la huella de
// gusto. `getProfileInRotation` devuelve null (y la sección no aparece) sin
// acceso o sin actividad que alcance el umbral (spec profile-in-rotation).
export async function InRotationSection({
  username,
  viewerId,
}: Omit<SectionProps, "isOwn">) {
  const data = await getProfileInRotation(username, viewerId);
  return data ? <InRotation data={data} /> : null;
}

// Franja de identidad — Nivel 1 (spec social-profiles, "Franja de identidad";
// openspec: redesign-user-profile-phase1): la ficha musical, el resumen de la
// huella con su década predominante y «Artistas seguidos». Los artistas reciben
// el subconjunto seguido en común con el visitante, ya calculado por el bloque
// de afinidad (`cache()` evita la doble consulta), para marcarlos con la
// insignia "tú también" (spec profile-affinity).
export async function IdentityStripSection({
  profile,
  viewerId,
}: {
  profile: ProfileView;
  viewerId: string | null;
}) {
  const [{ artists, totalCount }, affinity, fingerprint, genreLabels] = await Promise.all([
    listProfileFollowedArtists(profile.username, viewerId),
    getProfileAffinity(profile.username, viewerId),
    getTasteFingerprint(profile.username, viewerId),
    identityGenreLabels(profile.genres, genreLocaleOf(await getLocale())),
  ]);
  const sharedArtistIds = affinity
    ? new Set(affinity.sharedFollowedArtists.map((entity) => entity.id))
    : undefined;
  // La década predominante va como dato grande: su frase del resumen sobra al lado.
  const topDecade = fingerprint
    ? ([...fingerprint.decades].sort((a, b) => b.count - a.count)[0]?.label ?? null)
    : null;
  const phrases = fingerprint
    ? fingerprint.summary.filter((phrase) => !(topDecade && phrase.includes(topDecade)))
    : [];

  return (
    <IdentityStrip
      username={profile.username}
      identity={{
        selfRoles: profile.selfRoles,
        genres: profile.genres,
        listeningFormats: profile.listeningFormats,
        prompts: profile.prompts,
      }}
      genreLabels={genreLabels}
      fingerprint={fingerprint ? { topDecade, phrases } : null}
      artists={artists}
      artistsTotal={totalCount}
      sharedArtistIds={sharedArtistIds}
    />
  );
}

// Fondo decorativo de la cabecera: la carátula del álbum definitorio,
// difuminada y fundida con la tinta (spec social-profiles, "Cabecera del
// perfil"). Usa la misma miniatura de ≤250 px que ya muestra la Tarjeta de
// Identidad: no pide ninguna imagen nueva. Sin álbum no dibuja nada y la
// cabecera queda con su fondo neutro.
export async function HeaderBackdropSection({ ownerId }: { ownerId: string }) {
  const { identityCard } = await getShowcase(ownerId);
  const cover = identityCard.album?.coverThumbUrl;
  if (!cover) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <div
        className="absolute -inset-16 bg-cover bg-[center_30%] opacity-30 blur-[52px] saturate-[1.1]"
        style={{ backgroundImage: `url(${JSON.stringify(cover)})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/40 to-ink" />
    </div>
  );
}

// Barra de anclas (spec social-profiles, "Cabecera del perfil"): comprueba
// livianamente qué secciones tienen contenido visible para no ofrecer un ancla
// vacía, con su recuento. Mismas consultas de una fila que las puertas al
// Nivel 3; independiente y con su propio <Suspense> en `page.tsx`.
export async function AnchorsSection({ username, viewerId }: Omit<SectionProps, "isOwn">) {
  const t = await getTranslations("users");
  const [diary, reviews, favorites, lists, caminos, collection] = await Promise.all([
    listUserDiary(username, viewerId, 1, 1),
    getProfileReviews(username, viewerId),
    getFavoritesPreview(username, viewerId),
    listUserLists(username, viewerId, 1, 1),
    listVisibleCaminos(username, viewerId, 1, 1),
    getCollectionPreview(username, viewerId),
  ]);
  const favoritesTotal =
    favorites.counts.artist + favorites.counts["release-group"] + favorites.counts.recording;

  const items: ProfileAnchor[] = [{ id: "perfil", label: t("anchors.summary") }];
  if (diary.entries.length > 0) items.push({ id: "diario", label: t("anchors.diary"), count: diary.totalCount });
  if (reviews && reviews.reviews.length > 0) {
    items.push({ id: "resenas", label: t("anchors.reviews"), count: reviews.total });
  }
  if (favoritesTotal > 0) items.push({ id: "favoritos", label: t("anchors.favorites"), count: favoritesTotal });
  // «Listas y recorridos»: el ancla cuenta ambos, como el título de su sección.
  if (lists.lists.length > 0 || caminos.caminos.length > 0) {
    items.push({ id: "listas", label: t("anchors.lists"), count: lists.totalCount + caminos.totalCount });
  }
  if (collection.totalEntries > 0) {
    items.push({ id: "coleccion", label: t("anchors.collection"), count: collection.totalEntries });
  }

  return <ProfileAnchors label={t("anchors.label")} items={items} />;
}

// Tarjeta de Identidad — Nivel 1 (openspec: rework-user-profile): el artista y
// el álbum definitorios, más el himno, elegidos solo desde su propio editor. Sustituye
// al antiguo `AnthemSection` en la barra lateral: el himno solo ya no alcanza
// para representar "quién es esta persona" en el primer vistazo.
export async function IdentityCardSection({ ownerId, isOwn = false }: { ownerId: string; isOwn?: boolean }) {
  const { identityCard } = await getShowcase(ownerId);
  const view = <IdentityCard identityCard={identityCard} />;
  if (!isOwn) return view;

  const t = await getTranslations("users");
  return (
    <EditableBlock
      label={t("identityCard.editor.heading")}
      empty={!identityCard.artist && !identityCard.album && !identityCard.anthem}
      editor={<OwnerIdentityCardEditor initial={identityCard} />}
    >
      {view}
    </EditableBlock>
  );
}

// "Empieza por aquí" — Nivel 2 (spec profile-showcase): hasta 4 recomendaciones
// con nota. Sin ítems, el bloque colapsa salvo para el dueño en modo edición.
export async function PinnedSection({ ownerId, isOwn = false }: { ownerId: string; isOwn?: boolean }) {
  const showcase = await getShowcase(ownerId);
  const { pinned } = showcase;
  const view = pinned.length > 0 ? <PinnedShowcase pinned={pinned} /> : null;
  if (!isOwn) return view;

  const t = await getTranslations("users");
  return (
    <EditableBlock
      label={t("showcase.edit.heading")}
      empty={pinned.length === 0}
      editor={<OwnerShowcaseEditor initial={showcase} />}
    >
      {view}
    </EditableBlock>
  );
}

export async function RecencySection({ username, viewerId }: Omit<SectionProps, "isOwn">) {
  return <ProfileRecency at={await getProfileRecency(username, viewerId)} />;
}

export async function AffinitySection({ username, viewerId }: Omit<SectionProps, "isOwn">) {
  const affinity = await getProfileAffinity(username, viewerId);
  if (!affinity) return null;
  return <ProfileAffinity affinity={affinity} compact />;
}

/** Entradas del diario en la vista previa del perfil. */
export const DIARY_PROFILE_PREVIEW = 5;

// Las filas del cuerpo (spec social-profiles, "Cuerpo del perfil en filas"; openspec:
// redesign-user-profile-phase2) deciden con datos si llevan una o dos secciones: con una
// sola, ocupa la fila entera. Para el dueño, un estante vacío se muestra igual (con su
// invitación a agregar), como antes.

// «Empieza por aquí» | «Valoraciones destacadas». Sin ítems fijados, el bloque editable
// vacío del dueño va solo, encima, para no reservar media fila en blanco cuando no edita.
export async function StartRow({
  ownerId,
  username,
  viewerId,
  isOwn,
}: SectionProps & { ownerId: string }) {
  const [{ pinned }, highlights] = await Promise.all([
    getShowcase(ownerId),
    getProfileRatingHighlights(username, viewerId),
  ]);
  const pinnedNode = <PinnedSection ownerId={ownerId} isOwn={isOwn} />;
  const highlightsNode = highlights.length > 0 ? <RatingHighlights highlights={highlights} /> : null;
  if (pinned.length === 0) {
    return (
      <>
        {isOwn && pinnedNode}
        <ProfileRow start={null} end={highlightsNode} />
      </>
    );
  }
  return <ProfileRow start={pinnedNode} end={highlightsNode} />;
}

// «Reseñas» | Diario (como tabla de sus entradas más recientes, sin caja con scroll).
export async function ReviewsDiaryRow({ username, viewerId, isOwn }: SectionProps) {
  const [t, reviews, diary] = await Promise.all([
    getTranslations("users"),
    getProfileReviews(username, viewerId),
    listUserDiary(username, viewerId, 1, DIARY_PROFILE_PREVIEW),
  ]);
  const reviewsNode = reviews && reviews.reviews.length > 0 ? <ProfileReviews data={reviews} /> : null;
  const diaryNode =
    diary.entries.length > 0 ? (
      <ProfileRail
        id="diario"
        label={t("diaryTitle")}
        count={diary.totalCount}
        more={{ href: `/users/${username}/diary`, label: t("seeAll") }}
      >
        <DiaryPreviewTable entries={diary.entries} />
      </ProfileRail>
    ) : isOwn ? (
      <EmptyRailForOwner label={t("diaryTitle")} message={t("railEmptyOwn")} />
    ) : null;
  return <ProfileRow start={reviewsNode} end={diaryNode} />;
}

export async function FavoritesRail({ username, viewerId, isOwn }: SectionProps) {
  const t = await getTranslations("users");
  const preview = await getFavoritesPreview(username, viewerId);
  const total = preview.counts.artist + preview.counts["release-group"] + preview.counts.recording;
  if (total === 0) {
    return isOwn ? (
      <EmptyRailForOwner label={t("favoritesTitle")} message={t("railEmptyOwn")} />
    ) : null;
  }
  return (
    <ProfileRail
      id="favoritos"
      label={t("favoritesTitle")}
      count={total}
      more={{ href: `/users/${username}/favorites`, label: t("seeAll") }}
    >
      <FavoritesPreview preview={preview} />
    </ProfileRail>
  );
}

// «Listas y recorridos» | Colección física. Un Camino nunca cuenta como "lista" en otro
// conteo (openspec: add-camino): el título suma ambos, cada «+N» enlaza su página.
// `canAct`: visitante con sesión que no es el dueño ni la previsualización — el único que
// ve Guardar/Seguir y Seguir mi progreso.
export async function ListsCollectionRow({
  username,
  viewerId,
  isOwn,
  canAct,
}: SectionProps & { canAct: boolean }) {
  const [t, lists, caminos, collection] = await Promise.all([
    getTranslations("users"),
    listUserLists(username, viewerId, 1, LISTS_AND_CAMINOS_PREVIEW),
    listVisibleCaminos(username, viewerId, 1, LISTS_AND_CAMINOS_PREVIEW),
    getCollectionPreview(username, viewerId),
  ]);
  const hasLists = lists.lists.length > 0 || caminos.caminos.length > 0;
  const listsNode = hasLists ? (
    <ProfileRail
      id="listas"
      label={t("listsTitle")}
      count={lists.totalCount + caminos.totalCount}
      more={
        lists.lists.length > 0
          ? { href: `/users/${username}/lists`, label: t("seeAll") }
          : { href: `/users/${username}/caminos`, label: t("seeAll") }
      }
    >
      <ListsAndCaminosPreview
        username={username}
        lists={lists.lists}
        listsTotal={lists.totalCount}
        caminos={caminos.caminos}
        caminosTotal={caminos.totalCount}
        canAct={canAct}
      />
    </ProfileRail>
  ) : isOwn ? (
    <EmptyRailForOwner label={t("listsTitle")} message={t("railEmptyOwn")} />
  ) : null;
  const collectionNode =
    collection.totalEntries > 0 ? (
      <ProfileRail
        id="coleccion"
        label={t("collectionTitle")}
        count={collection.totalEntries}
        more={{ href: `/users/${username}/collection`, label: t("seeAll") }}
      >
        <CollectionPreview artists={collection.artists} />
      </ProfileRail>
    ) : isOwn ? (
      <EmptyRailForOwner label={t("collectionTitle")} message={t("railEmptyOwn")} />
    ) : null;
  return <ProfileRow start={listsNode} end={collectionNode} />;
}

// Estante "Conciertos" (openspec: add-my-concerts): los últimos registros visibles y la puerta a
// `/users/[username]/concerts`. El conteo es el total visible, no lo traído.
export async function ConcertsRail({ username, viewerId, isOwn }: SectionProps) {
  const t = await getTranslations("concerts.profile");
  const preview = await getConcertPreview(username, viewerId);
  if (preview.total === 0) {
    return isOwn ? <EmptyRailForOwner label={t("rail")} message={t("emptyOwn")} /> : null;
  }
  return (
    <ProfileRail id="conciertos" label={t("rail")} count={preview.total}>
      <ConcertsPreview entries={preview.entries} total={preview.total} username={username} />
    </ProfileRail>
  );
}

// Aviso para quien no sigue un perfil público (openspec: redesign-private-profile-phase2): al final
// del cuerpo, genérico y siempre; si no hay nada visible para ese visitante, «Nada público por ahora»
// en su lugar (las demás secciones devuelven `null`, así que queda justo debajo de la cabecera).
// `page.tsx` solo la monta para quien no es el dueño ni sigue el perfil.
export async function FollowersNoteSection({
  profile,
  viewerId,
  authenticated,
  preview,
}: {
  profile: ProfileView;
  viewerId: string | null;
  authenticated: boolean;
  preview: boolean;
}) {
  const visible = await profileHasVisibleContent(profile, viewerId);
  return (
    <FollowersOnlyNote
      profile={profile}
      authenticated={authenticated}
      preview={preview}
      variant={visible ? "note" : "empty"}
    />
  );
}
