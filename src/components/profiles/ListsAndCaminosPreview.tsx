import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ProfileListCard } from "@/components/lists/ProfileListCard";
import { CaminoProfileCard } from "@/components/camino/CaminoProfileCard";
import type { CaminoProfileSummary, UserListSummary } from "@/lib/api/schemas";

/** Tarjetas que caben en la vista previa (2 × 2 en escritorio). */
export const LISTS_AND_CAMINOS_PREVIEW = 4;
/** Recorridos como máximo cuando también hay listas, para que ninguno de los dos desaparezca. */
export const CAMINOS_IN_PREVIEW = 2;

interface ListsAndCaminosPreviewProps {
  username: string;
  lists: UserListSummary[];
  listsTotal: number;
  caminos: CaminoProfileSummary[];
  caminosTotal: number;
  /** Visitante con sesión que no es el dueño: único que ve Guardar/Seguir y Seguir mi progreso. */
  canAct: boolean;
  /** Vista del dueño: marca las listas y Caminos que no son públicos (redesign-owner-profile-phase2). */
  showAudience?: boolean;
}

// «Listas y recorridos» del perfil (spec social-profiles, "Cuerpo del perfil en filas";
// spec camino, "Estante Caminos en el perfil"; openspec: redesign-user-profile-phase2):
// las listas (fijadas primero) y los recorridos del dueño como tarjetas con mosaico, hasta
// 4 —con 2 recorridos como máximo—, y un enlace «+N» a la página de cada uno cuando
// sobran. Las acciones con sesión solo se ofrecen a quien puede usarlas. Server Component.
export async function ListsAndCaminosPreview({
  username,
  lists,
  listsTotal,
  caminos,
  caminosTotal,
  canAct,
  showAudience = false,
}: ListsAndCaminosPreviewProps) {
  // Sin listas, los recorridos ocupan todas las tarjetas; con listas, hasta 2.
  const caminoSlots = lists.length === 0 ? LISTS_AND_CAMINOS_PREVIEW : CAMINOS_IN_PREVIEW;
  const shownCaminos = caminos.slice(0, Math.min(caminoSlots, LISTS_AND_CAMINOS_PREVIEW));
  const shownLists = lists.slice(0, LISTS_AND_CAMINOS_PREVIEW - shownCaminos.length);
  if (shownLists.length === 0 && shownCaminos.length === 0) return null;

  const t = await getTranslations("users");
  const base = `/users/${encodeURIComponent(username)}`;
  const moreLists = listsTotal - shownLists.length;
  const moreCaminos = caminosTotal - shownCaminos.length;

  return (
    <div className="flex w-full flex-col gap-3">
      <ul className="grid gap-4 sm:grid-cols-2">
        {shownLists.map((list) => (
          <li key={list.id} className="flex min-w-0">
            <ProfileListCard list={list} username={username} canAct={canAct} showAudience={showAudience} className="w-full" />
          </li>
        ))}
        {shownCaminos.map((camino) => (
          <li key={camino.id} className="flex min-w-0">
            <CaminoProfileCard
              camino={camino}
              username={username}
              canTrack={canAct}
              showAudience={showAudience}
              className="w-full"
            />
          </li>
        ))}
      </ul>
      {(moreLists > 0 || moreCaminos > 0) && (
        <p className="flex flex-wrap gap-x-4 gap-y-1 font-data text-xs text-paper-muted">
          {moreLists > 0 && (
            <Link href={`${base}/lists`} className="transition-colors hover:text-amber">
              +{moreLists} · {t("listsAndCaminos.moreLists", { count: listsTotal })}
            </Link>
          )}
          {moreCaminos > 0 && (
            <Link href={`${base}/caminos`} className="transition-colors hover:text-amber">
              +{moreCaminos} · {t("listsAndCaminos.moreCaminos", { count: caminosTotal })}
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
