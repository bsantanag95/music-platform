import { Skeleton } from "@/components/ui/Skeleton";

// Carga de la pestaña Reseñas: filas del índice (openspec: redesign-album-page, tarea 3.6).
export default function AlbumReviewsLoading() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <Skeleton variant="block" className="h-6 w-32" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton variant="block" className="h-4 flex-1" />
          <Skeleton variant="block" className="h-4 w-16" />
          <Skeleton variant="block" className="hidden h-4 w-28 sm:block" />
        </div>
      ))}
    </div>
  );
}
