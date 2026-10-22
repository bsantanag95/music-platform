## Context

`/me/want-to-listen` es `WantToListenList` con dos secciones (artistas, álbumes) y tres renderers. Favoritos se
calcó de esta página y ya corrigió en su Fase 1 los mismos defectos; esta fase aplica ese procedimiento sin cambiar el
diseño de las vistas, que se rehace en la Fase 3. La acción de discografía (recorrido de artista) llega por lote
(`useJourneyStatuses`) después del primer render.

Restricciones: sin API ni esquema nuevos; Pendientes no tiene superficie pública; el modo de vista sigue siendo
preferencia del dispositivo en `localStorage`.

## Goals / Non-Goals

**Goals:** sin parpadeo; título siempre legible; nada que se superponga; conteos verdaderos; sin desplazamiento al
llegar el estado de discografía; áreas táctiles; avisos accesibles; estado vacío con salida.

**Non-Goals:** filtros, orden, menú, deshacer, metadatos nuevos, foto de artista (fases 2 y 3).

## Decisions

**D1. Mismo patrón de `ready` que ratings y favoritos.** `useWantToListenViewMode` devuelve `ready` como tercer
elemento (verdadero tras leer `localStorage`, también si lanza). Mientras no está listo, el listado pinta un marcador
neutro (`aria-hidden`, pulso solo con `motion-safe`) y el conmutador queda `invisible`.

**D2. Ancho lo fija la página.** `main` pasa a `mx-auto w-full max-w-4xl` con el título a la izquierda;
`WantToListenList` deja `max-w-3xl` y llena su contenedor.

**D3. Detallada: acciones bajo el texto en móvil.** El bloque de texto y acciones pasa de una fila a
`flex-col items-start` bajo `sm` y a fila desde `sm`; las acciones admiten `flex-wrap`. Así el título nunca compite
con las acciones por el ancho en pantallas angostas. Alternativa descartada: truncar la acción (oculta lo que hace)
o moverla a un menú (es la Fase 3).

**D4. Gráfico: acciones en columna y texto que se parte.** El `li` gana `min-w-0` y las acciones se apilan
(`flex-col items-start`); `RemoveEntryButton` y la acción de discografía llevan `max-w-full text-left`, así el texto
largo pasa a una segunda línea dentro de la tarjeta. El origen del error era una fila `flex-wrap` con elementos
`shrink-0` más anchos que la tarjeta.

**D5. Índice: sin atenuar y artista en segunda línea bajo `sm`.** Igual que favoritos: el contenedor de acciones
deja `sm:opacity-40`; el enlace pasa a dos `span` truncables, en columna bajo `sm` y en línea desde `sm`.

**D6. Acción de discografía estable.** Mientras el estado es `loading`, la acción renderiza un marcador `invisible`
y `aria-hidden` con el texto de "Completar discografía", que ocupa su espacio; con `error` sigue sin renderizarse
(caso raro, la entrada sigue usable). El texto se unifica con la página del artista: "Completar discografía" /
"Complete discography"; "Ya está en tu discografía" se conserva.

**D7. Conteo solo con la lista completa.** `WantToListenSection` recibe `complete` (`!hasNext`) y solo entonces
muestra "(N)". Es el mismo criterio que el contador por artista de Calificaciones. Alternativa descartada para esta
fase: conteos del servidor (Fase 2, con el filtro por tipo).

**D8. Áreas táctiles con `@media (pointer: coarse)`.** `min-h-11` e `inline-flex items-center` en "Quitar", la acción
de discografía y los botones del conmutador. Con ratón nada cambia.

**D9. Anuncio y error por entrada.** Quitar con éxito escribe en una región `status` (`removedAnnouncement`). Un fallo
al quitar guarda `errorId` y los tres renderers muestran `removeError` con `role="alert"` bajo esa entrada;
`loadError` queda solo para "Cargar más", junto al botón. `WantToListenRowActions` gana `errorId`.

**D10. Prioridad de carátula.** `WantToListenList` pasa los ids de las primeras seis entradas (`priorityIds`) a los
renderers, que lo pasan a `CoverThumb`.

**D11. Estado vacío con salida.** `EmptyState` recibe un enlace a `/search` con `emptyCta`, con el mismo estilo que
el de Favoritos.

## Risks / Trade-offs

- [El marcador aparece un instante en cada carga] → Frame neutro sin saltos de ancho, mejor que el salto actual.
- [Sin cifra en el encabezado mientras haya más páginas] → Es preferible a una cifra falsa; la Fase 2 trae los
  conteos del servidor.
- [Las tarjetas del Gráfico de artistas crecen en alto cuando la acción ocupa dos líneas] → Temporal; la Fase 3 la
  mueve a un menú.

## Migration Plan

Solo front-end; sin migraciones. Revertir es revertir el commit.
