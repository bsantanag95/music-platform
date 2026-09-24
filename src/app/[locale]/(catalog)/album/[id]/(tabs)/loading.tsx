import { Skeleton } from "@/components/ui/Skeleton";

// Carga de la pestaña Canciones al cambiar de pestaña: la cabecera del layout ya está en
// pantalla, solo se esqueletiza la lista (openspec: redesign-album-page, tarea 3.6).
export default function AlbumSongsLoading() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton variant="block" className="h-4 w-8" />
          <Skeleton variant="block" className="h-4 flex-1" />
          <Skeleton variant="block" className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}
