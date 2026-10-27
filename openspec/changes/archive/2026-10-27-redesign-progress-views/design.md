## Context

La filosofía de producto (§6.4.1) pide un progreso discreto: ninguna fracción ni "te faltan N" fuera de la gestión. La
fila puede, en cambio, nombrar un disco y una fecha sin contar nada. Las Fases 1 y 2 dejaron la barra accesible, los
segmentos y el orden "Más avanzadas".

## Decisions

**D1. Datos por lote.** `progressDetailsByListId(trackerId, [{ id, order }])` hace dos consultas para todas las listas
de la pestaña:
- `max(listen_entry.created_at)` sobre los discos de cada selección (la fecha de registro es la de la escucha; el diario
  no guarda otra).
- Los ítems sin escucha de quien sigue el progreso, con título, año y artista principal. Se ordenan en memoria:
  discografías (`order: "release"`) por fecha de publicación, con el año como respaldo y lo que no tiene fecha al final;
  listas (`order: "position"`) por el orden manual.

Los tres listados (`listMyArtistJourneys`, `listMyCaminos`, `listTrackedLists`) agregan `nextUp` y `lastListenedAt`;
`GET /api/me/caminos` los devuelve.

**D2. `ProgressRowMeta`.** "Siguiente: <álbum> (año)" enlaza al álbum y va con la última escucha en relativo. Una
selección completa no propone siguiente. Una vacía muestra el texto de su pestaña ("Sin discos en tu selección",
"Vacía: añade álbumes con «Añadir a…»", "La lista está vacía"). Reemplaza "Actualizado".

**D3. Etiqueta de estado solo si no está en curso.** "En curso" es el estado normal de esta página; repetirlo en cada
fila tapaba los que sí destacan. Completo y Archivado conservan su etiqueta.

**D4. Secciones y fin de "Por estado".** Con "Todas", `ProgressSections` agrupa En curso, Completas y Archivadas, cada
grupo con el orden elegido. Archivadas empieza plegada (botón con `aria-expanded`). Con un estado elegido no hay
encabezados. Ordenar "Por estado" sobre secciones no hacía nada, así que se quita de `OWN_SORTS`; un `?sort=state` viejo
se ignora como cualquier valor inválido.

**D5. Listas que sigo.** Misma segunda fila que las otras pestañas. "Dejar de seguir" pasa a un menú ⋯ (`RowMenu`, 32/44
px) con "Ver lista"; sigue mostrando el aviso con Deshacer de la Fase 1.

**D6. Gráfico.** Barra discreta a todo el ancho bajo la foto o la carátula; la línea de estado solo para completas y
archivadas.

## Risks / Trade-offs

- [Una consulta extra con `NOT EXISTS` por pestaña] → Usa los índices de `listen_entry (release_group_id)` y de
  `user_list_item (list_id)`; es por lote, no por fila.
- [`created_at` es la fecha en que se registró la escucha, no necesariamente la de la escucha] → Es la misma fecha que
  usa el diario.
