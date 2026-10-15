# ADR 0039 — Presentadores de colección

## Estado

Aceptado (cambio `add-collection-presenters`, 2026-10). Complementa el [ADR 0037](0037-titulos-y-rutas-de-colecciones-por-idioma.md)
(mismo principio: se localiza al presentar) y el [ADR 0038](0038-coleccion-y-lista-un-solo-riel.md) (la colección es
contenido de la plataforma, con voz propia).

## Contexto

El detalle de una colección generada explicaba por qué esos discos estaban ahí con un `if` en la página: la cartela de
cada disco la decidía `collectionNote(family, fechas)` por familia, y solo Premios salía de ese molde, con una rama
`family === "awards"` que llamaba a la lectura de premios. Cada colección nueva que quisiera explicarse obligaba a tocar
la página, y la decisión estaba en el lugar equivocado: se tomaba por familia, pero el contexto es de la plantilla.
"Lanzamientos" agrupa Novedades esenciales y Lo que viene, que necesitan cosas distintas ("hace 5 días" contra "sale en 9
días"); lo que la plantilla ya sabe (su ventana de 90 días) vivía solo en su `plan()`.

## Decisión

1. **Un presentador por plantilla.** Cada colección generada declara cómo se explica en su detalle con un contrato
   pequeño y declarativo, `CollectionContext`: un resumen para la cabecera, un enlace opcional, una cartela por disco, una
   partición opcional de los discos en grupos y si se numeran.
2. **Datos, no texto.** El presentador devuelve referencias a mensajes (clave y parámetros) y el resolvedor las convierte
   en el texto del idioma activo con el grupo `catalog.explore.collectionContext`. Los parámetros pueden ser textos,
   números, fechas (`DatePart`, formateadas en UTC) o textos en los dos idiomas (`LocalizedText`, para lo que el catálogo
   guarda traducido, como el nombre de una categoría de premios). Nada traducido se guarda ni se calcula en el servicio.
3. **El registro vive aparte de las plantillas.** `COLLECTION_TEMPLATES` no cambia: la plantilla escribe y corre en la
   generación; el presentador lee y corre en la petición de la página. Una prueba exige que toda clave de presentador exista
   entre las plantillas y que toda familia tenga el suyo.
4. **Caída plantilla → familia → vacío**, y un presentador puede **abstenerse** (`null`) o fallar: la resolución sigue con
   el siguiente nivel, así que un contexto que falla nunca tumba el detalle. Los presentadores de familia reproducen lo que
   se mostraba antes (efemérides: aniversario; lanzamientos: fecha; el resto: año; `rankings` numera).
5. **El contrato es lo mínimo que alcanza.** Un presentador puede dar resumen, enlace, cartela, grupos y numeración. No
   puede elegir discos, cambiar su orden, filtrar ni describir componentes: eso es de `plan()` y de la interfaz. Los grupos
   son una **partición** forzada (`normalizeGroups`): se descartan los ids ajenos y los discos sin grupo van a un último
   grupo sin encabezado, de modo que un presentador defectuoso nunca esconde un disco.
6. **Una consulta por dato y por lote**, nunca una por disco, dentro de la misma petición de la página: no escribe, no usa
   `after()` y no sale a ninguna fuente externa. La fecha de hoy (UTC) se inyecta para probar las cartelas relativas.
7. **La página no conoce familias ni plantillas.** Llama a `presentCollection` y a `renderContext` y pasa el resultado a la
   cabecera y a la rejilla. El resumen de la cabecera se resuelve: descripción escrita → resumen del presentador →
   descripción genérica de la familia. La numeración sobre la carátula solo aparece si el presentador la pide.
8. **Presentadores iniciales:** Premios (categorías ganadas por disco, ceremonia y enlace), las cinco familias y Novedades
   esenciales (rango real de los discos mostrados, cartela relativa y agrupación por mes), que es la prueba de que el
   contrato alcanza.

## Alternativas descartadas

- **Que el presentador devuelva cadenas y reciba el idioma:** más corto al principio, pero mezcla lectura y traducción,
  obliga a pasar el idioma por los servicios y deja los textos fuera de los catálogos y de su prueba de completitud.
- **Un método `present()` en `CollectionTemplate`:** acopla la generación (con lock y presupuesto de carátulas) a la
  lectura, obliga a importar el módulo de generación desde la página y no cubre una colección cuya plantilla fue retirada.
- **Migrar las ocho plantillas de una vez:** mucho riesgo para poco aprendizaje; con la caída, las que no tienen
  presentador siguen exactamente igual.
- **Un contrato que filtre, ordene o elija discos:** sería un segundo `plan()`. El filtro por tipo (Álbumes / Singles y EPs)
  no entra porque ningún caso real lo exige todavía.

## Consecuencias

- Agregar contexto a una colección es escribir **un presentador, sus textos y una línea en el registro**; la página no
  cambia.
- Los textos de los presentadores están todos en `catalog.explore.collectionContext`, con claves tipadas
  (`CONTEXT_MESSAGE_KEYS`): una clave mal escrita falla al compilar y otra sin traducir falla en la prueba.
- Una referencia cuya clave no existe se omite: nunca se ve una clave cruda en pantalla.
- Solo el detalle de las colecciones **generadas** usa presentadores. Las colecciones curadas se abren en la página de
  lista de la cuenta curadora y no cambian.
- Quedan sin presentador propio `upcoming`, `anniversaries`, `one-per-decade`, `genre-spotlight` y los rankings; usan el de
  su familia hasta que un cambio posterior les dé el suyo.

## Seguimiento

El cambio `add-remaining-collection-presenters` (2026-10) completó la cobertura sin tocar el contrato ni el registro: ahora
**cada plantilla** del registro tiene presentador propio (`upcoming`, `anniversaries`, `genre-spotlight`, `one-per-decade`,
`top-rated-quarter` y `most-reviewed-month`, además de los dos iniciales) y una prueba lo exige. Los presentadores de familia
quedan como respaldo para colecciones cuya plantilla se retiró. Las decisiones nuevas: los datos que dependen de una fecha
de la colección salen de su `period_key` y no del reloj (una colección archivada dice la edad, el trimestre o el mes que
tenía entonces); un período ilegible hace que el presentador se abstenga; y los rankings leen sus cifras del período del
propio ranking, con los mismos filtros que la plantilla.
