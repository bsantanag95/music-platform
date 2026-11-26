## Decisions

### Panel como franja, no partido
Se mantiene un solo `ArtistRelationPanel` (el estado de los conmutadores y de las filas es compartido y la spec pide todas las
acciones reunidas) con una presentación nueva: franja a todo el ancho del contenedor de 88rem, justo bajo la portada. En escritorio,
rejilla `[auto_1fr]`: a la izquierda «Tu relación» y los tres conmutadores en fila; a la derecha las filas en tres columnas
(Escuchas, Colección, En vivo / Valoraciones, Listas, Recorrido). En tableta dos columnas; en el teléfono una. Los formularios que se
despliegan (detalles de escucha, selector de listas) crecen dentro de su celda.
*Alternativa descartada:* dejar los conmutadores en la portada y el resto abajo: dos componentes con estado duplicado y acciones
repartidas, contra la spec.

### Retrato y abanico sin repetir
`stageBackdrop(covers, exclude)` recibe el id de la carátula usada como retrato. En el abanico se excluye; el fondo desenfocado
(`ambient`) sigue siendo el último trabajo aunque sea esa misma carátula. Si no queda ninguna funda, el abanico dibuja el disco solo.
El muro no cambia (es textura).

### Ficha en tres líneas
`ArtistFacts` agrupa las filas: línea 1, géneros, tipo y datos de identidad; línea 2, alineación, premios y comunidad; línea 3,
enlaces y En vivo. La alineación muestra hasta 3 nombres y «y N más» antes del enlace. Las filas cuyo valor solo no se entiende
llevan su rótulo visible delante («Primer disco 1977», «Falleció 2006»); el resto mantiene el rótulo solo para lectores de pantalla.
Enlaces externos en `text-paper/70`, sin subrayado punteado (subrayado al pasar), con `↗`.

### Carátulas con presupuesto
`resolveStageCovers(view)` (servicio): toma los discos de Principal sin carátula resuelta (`coverResolved === false`), del más
reciente al más antiguo, hasta 12, solo si las carátulas resueltas no llegan a `min(discos de Principal, 8)`. Lanza
`findOrResolveCover` en paralelo, espera como mucho 1,5 s y devuelve las URL que llegaron; las demás terminan en `after()`. El
layout las suma a las carátulas de la portada. Son las mismas consultas a Cover Art Archive que haría la grilla al mostrarse
(ninguna a MusicBrainz).

## Risks

- [1,5 s más en la primera visita de un artista sin carátulas] → Solo cuando faltan; las visitas siguientes no esperan nada.
- [La franja agrega alto bajo la portada con sesión] → Unos 170 px en escritorio, contra los ~350 px vacíos que quita.
