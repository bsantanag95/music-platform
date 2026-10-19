import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { progressHref } from "@/components/progress/progress-tabs";

// Ruta anterior de los recorridos: ahora son la pestaña Discografías del panel
// de progreso (openspec: clarify-user-menu-names). El detalle
// `/me/artist-journeys/[artistId]` no cambia.
export default async function ArtistJourneysPage() {
  redirect(`/${await getLocale()}${progressHref("discographies")}`);
}
