// Marcador de la colección mientras se lee el modo guardado: unas filas neutras, sin fichas ni texto, para no pintar
// la Estantería y saltar después al modo de la persona. Lo comparten la página propia, la del perfil y la
// previsualización del perfil.
export function CollectionPlaceholder() {
  return (
    <div aria-hidden data-testid="collection-placeholder" className="flex flex-col gap-2">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="h-16 rounded-lg bg-ink-surface motion-safe:animate-pulse" />
      ))}
    </div>
  );
}
