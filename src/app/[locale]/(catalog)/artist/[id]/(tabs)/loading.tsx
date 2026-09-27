import { Skeleton } from "@/components/ui/Skeleton";

// Carga de una pestaña al cambiar de pestaña: la cabecera del layout ya está en pantalla,
// solo se esqueletiza el contenido (openspec: redesign-artist-page).
export default function ArtistTabLoading() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6" aria-busy="true">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton variant="disc" className="aspect-square w-full" />
          <Skeleton variant="block" className="h-4 w-full" />
          <Skeleton variant="block" className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
