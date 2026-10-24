## Context

`/me/collection` tiene dos pestañas: Tengo (`CollectionShelf`, tres renderers, toolbar, selección y cambio de audiencia en
lote) y Busco (`WantedShelf`, lista simple). `CollectionShelf` también sirve la colección del perfil en modo lectura
(`/users/[username]/collection`), que no se toca salvo lo compartido por los renderers. El formulario de una copia
(`CollectionEntryForm`) ya filtra los atributos de vinilo al cambiar de formato, pero el servidor no valida la
combinación y hay al menos una copia real en CD con `colored-vinyl`.

## Goals / Non-Goals

**Goals:** servidor coherente con el formulario; quitar disponible y reversible en todas las vistas; sin huecos ni
saltos; filtros compartibles por URL; controles legibles y táctiles; selección evidente.

**Non-Goals:** cambios de diseño de las vistas, conteos nuevos, "Sin agrupar" (fases 2 y 3).

## Decisions

**D1. Coherencia en la capa de servicio, no en SQL.** `vocabulary.ts` gana `incompatibleAttributes(format, attributes)`
(los atributos de vinilo con un formato distinto de vinilo; con formato `null` ninguno). `addEntry` y `addWantedEntries`
rechazan con `400 VALIDATION_ERROR` si hay alguno. En `updateEntry` / `updateWantedEntry`, cuando cambian formato o
atributos se lee la fila actual: si llegan atributos, se validan contra el formato resultante (400 si no encajan); si solo
cambia el formato, se quitan los atributos que dejan de aplicar. Así una edición de solo formato hace lo mismo que el
formulario. Alternativa descartada: un `CHECK` sobre `collection_entry` / `wanted_entry`, que exige una migración que
reescriba las filas heredadas y numerar una migración mientras otra rama abierta también agrega una; queda como mejora
posible y no cambia el contrato.

**D2. El formulario corrige el dato heredado.** `entryToFormValue` y `wantedEntryToFormValue` dejan solo los atributos
que aplican al formato; los controles comparan con la entrada y, si se quitó alguno, el formulario muestra
`incompatibleNotice` ("«Vinilo de color» no aplica a CD. Se quitará al guardar."). Guardar envía los atributos limpios.
No hay escritura silenciosa: el aviso se ve antes de guardar.

**D3. Quitar con deshacer.** Quitar sigue siendo inmediato y optimista. Un `UndoToast` genérico (`ui/`, `role="status"`,
6 s, uno a la vez) ofrece "Deshacer", que vuelve a crear la copia con `POST /api/me/collection` (álbum, formato,
atributos, nota, audiencia) o la variante con `POST /api/me/collection/wanted`. La copia restaurada es una entrada nueva
(su fecha de alta cambia), como en Favoritos. Si deshacer falla, el aviso lo dice sin botón. Un fallo al quitar guarda
`errorId` y el error aparece bajo esa entrada con `role="alert"`; el quitado se anuncia en la región `status`.

**D4. Estantería con "Quitar".** La ficha muestra "Editar · Quitar" bajo el pie. El panel de edición sigue igual.

**D5. Índice: controles en la fila.** Se elimina `sm:opacity-0`; el contenido y los controles van en una fila
`flex-wrap` con los controles a la derecha (`ml-auto`) desde `sm` y en una segunda línea bajo `sm`.

**D6. URL con `replaceState`.** Una función pura `filtersQueryString(search, filters)` arma la query con solo los
valores distintos del defecto; Tengo y Busco la escriben con `history.replaceState` al cambiar filtros (sin navegar ni
recargar). La página ya los lee al cargar.

**D7. `ready` como en las otras páginas.** `useCollectionViewMode` devuelve `ready`; hasta entonces, marcador neutro
(`aria-hidden`, pulso solo con `motion-safe`) y conmutador `invisible`. El perfil usa el mismo hook.

**D8. Ancho y encabezado.** La página propia pasa a `mx-auto w-full max-w-4xl` con título y pestañas a la izquierda;
`CollectionShelf` y `WantedShelf` dejan de fijar `max-w-3xl` y llenan su contenedor; el perfil ya envuelve en
`max-w-3xl`.

**D9. Selección.** En modo selección, la carátula deja de navegar y alterna la marca (`aria-pressed` en un botón que
cubre la carátula); la ficha marcada lleva anillo ámbar; la casilla llega a 24 px con puntero grueso.

**D10. Áreas táctiles.** Con `@media (pointer: coarse)`: `min-h-11` en Editar, Quitar, el selector rápido de audiencia,
las pestañas, el conmutador y los botones de la barra de lote. Con ratón no cambia.

**D11. Selectores legibles.** Anchos en `ch` que caben el texto más largo de cada select (formato 22ch, atributo 25ch,
agrupar 22ch, orden 14ch) y "Por fecha de agregado" pasa a "Por fecha de alta".

## Risks / Trade-offs

- [La copia restaurada pierde su fecha de alta original] → Mismo criterio que Favoritos; deshacer es un rescate inmediato.
- [Copias heredadas incoherentes siguen visibles hasta editarlas] → El aviso las corrige al editar; un `CHECK` futuro
  podría limpiarlas en bloque.
- [Más líneas en la Estantería por "Quitar"] → Temporal; la Fase 3 lo pasa al menú `⋯`.

## Migration Plan

Sin migraciones. Revertir es revertir el commit.
