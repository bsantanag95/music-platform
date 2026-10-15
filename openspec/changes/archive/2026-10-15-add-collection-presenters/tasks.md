## 1. Contrato y resolvedor de mensajes

- [x] 1.1 `presenters/types.ts` en `src/services/discovery/collections/`: `MessageRef`, `DatePart`, `CollectionContext`,
      `PresenterInput` (`templateKey`, `periodKey`, `family`, `albumIds`, `today`) y `CollectionPresenter` (devuelve el
      contexto o `null` para abstenerse); `EMPTY_CONTEXT`
- [x] 1.2 `normalizeGroups(albumIds, groups)`: descarta ids ajenos, conserva el orden de la lista dentro de cada grupo y
      manda los discos sin grupo a un último grupo sin encabezado; pruebas de la partición
- [x] 1.3 Resolvedor puro `renderContext(context, { t, locale, items })`: convierte cada `MessageRef` con la traducción de
      `catalog.explore.collectionContext`, formatea cada `DatePart` en UTC (`short`, `long`, `day-month`, `month-year`),
      omite una clave inexistente en lugar de mostrarla y devuelve notas por id de ítem, grupos con sus ítems, resumen y
      enlace ya como texto; pruebas en español e inglés, clave inexistente y fecha sin correr el día
- [x] 1.4 Registro `presenters/index.ts` con `presentCollection(input)`: presentador de la plantilla → de la familia →
      `EMPTY_CONTEXT`, y el presentador que devuelve `null` cae al siguiente nivel; pruebas de la caída, de la abstención
      y de una plantilla retirada
- [x] 1.5 Pruebas de consistencia del registro: toda clave de presentador existe en `COLLECTION_TEMPLATES` y toda
      familia tiene presentador; toda clave de mensaje que emiten los presentadores existe en los dos catálogos

## 2. Presentadores de familia

- [x] 2.1 `presenters/families.ts`: efemérides (aniversario con fecha completa, o el año), lanzamientos (fecha completa),
      descubrimiento y premios (año) y rankings (año, numerado), reproduciendo `collectionNote` con una consulta por
      lote (`albumReleaseDates`); la parte de decisión como función pura con la fecha de hoy inyectable
- [x] 2.2 Grupo `catalog.explore.collectionContext` en `messages/{es,en}/catalog.json` con los textos de las cartelas
      de familia (`anniversary`, `date`, `year`), traspasando `collectionNoteAnniversary`
- [x] 2.3 Pruebas de cada presentador de familia con los mismos casos que hoy cubre `collection-notes.test.ts`

## 3. Presentador de Premios

- [x] 3.1 `presenters/awards.ts` sobre `ceremonyContext`: cartela con las categorías ganadas (generales primero, hasta
      dos y «+N»), resumen de la ceremonia con su fecha larga, enlace a `/awards/<premio>/<año>`, sin numerar; se abstiene
      si la ceremonia no está cargada
- [x] 3.2 Textos de Premios en `catalog.explore.collectionContext` (resumen, enlace) en los dos idiomas; las categorías
      siguen viniendo de `award_category.name_es` / `name_en` y se emiten como parámetros del idioma activo
- [x] 3.3 Pruebas: categorías de un disco, tres categorías con «+1», resumen y enlace, abstención sin ceremonia y que no
      numera
- [x] 3.4 Mover `AWARD_NAMES` a un lugar que importen el título y el presentador sin duplicarlo

## 4. Presentador de Novedades esenciales

- [x] 4.1 `presenters/new-releases.ts`: función pura `buildNewReleasesContext(rows, today)` (rango real de los discos
      con fecha completa, cartela relativa, grupos por mes del más reciente al más antiguo, discos sin fecha al grupo
      final) y el presentador que consulta `albumReleaseDates` una vez por lote
- [x] 4.2 Textos en `catalog.explore.collectionContext`: resumen con la ventana y el rango, "Hoy", "Ayer", "Hace N días",
      "Hace N semanas" con la fecha corta, y el encabezado de mes, en español e inglés con plurales
- [x] 4.3 Pruebas: rango, hoy / ayer / días / semanas, agrupación por mes con orden dentro del grupo, disco sin fecha
      completa, lista sin ningún disco con fecha (sin resumen de rango) y fecha de hoy inyectada
- [x] 4.4 Registrar `new-releases` en el registro de presentadores

## 5. Página y componentes

- [x] 5.1 `CollectionAlbumGrid`: aceptar `groups` (sección por grupo con su encabezado y las mismas tarjetas) y seguir
      aceptando `notes` y `numbered`; sin grupos se comporta como hoy; pruebas con y sin grupos
- [x] 5.2 `CollectionDetailHeader`: recibir el resumen y el enlace ya resueltos; conservar el orden descripción escrita →
      resumen → descripción de la familia; ajustar sus pruebas
- [x] 5.3 `[segment]/page.tsx`: una sola llamada a `presentCollection` + `renderContext`; retirar las importaciones de
      `ceremonyContext`, `awardNote`, `collectionNote`, `albumReleaseDates` y `formatNoteDate` y toda rama por familia;
      pasar `numbered` desde el contexto; ajustar `page.test.tsx`
- [x] 5.4 Retirar `collection-notes.ts` y sus pruebas cuando ya nadie lo importe (conservando `formatLongDate` /
      `formatNoteDate` solo si el resolvedor los reutiliza)
- [x] 5.5 Retirar las claves de mensaje que ya no se usan (`collectionNoteAnniversary`, `collectionAwardsContext`,
      `collectionAwardsLink`) tras moverlas al grupo `collectionContext`

## 6. Documentación

- [x] 6.1 ADR 0039: presentadores de colección (datos, registro aparte de las plantillas, caída, contrato mínimo)
- [x] 6.2 `docs/05-features/explore.md`: cómo se explica una colección, cómo se agrega un presentador y qué no puede pedir
- [x] 6.3 `AGENTS.md`: lo que verifica el smoke test desde este cambio

## 7. Verificación

- [x] 7.1 Ampliar `scripts/smoke-test-explore-collections.ts`: los presentadores reales de Premios y de Novedades
      esenciales contra la base de scratch (cartela, resumen y grupos con datos reales) y que consultan por lote, no por
      disco
- [x] 7.2 Comprobar en el navegador, en español e inglés y en móvil, la colección de Grammy (sin cambio visible) y
      Novedades esenciales (resumen, cartelas relativas y meses)
- [x] 7.3 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
