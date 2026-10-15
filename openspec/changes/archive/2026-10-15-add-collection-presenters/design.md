## Context

El detalle de una colección generada (`/explore/collections/<slug>-<id>`) arma su contexto dentro de la página:

- `collectionNote(family, fechas)` ([collection-notes.ts](../../../src/components/discovery/collection-notes.ts)) decide
  la cartela de cada disco **por familia**: efemérides → aniversario, lanzamientos → fecha, el resto → año.
- Solo Premios sale de ese molde, y lo hace con una rama en la página: `family === "awards"` →
  `ceremonyContext(periodKey, ids)` ([collection-context.ts](../../../src/services/awards/collection-context.ts)) →
  categoría ganada por disco, resumen de la cabecera y enlace a la ceremonia.
- La cabecera elige su descripción en este orden: la escrita a mano, el `context` concreto, o la genérica de la
  familia. `CollectionAlbumGrid` recibe `notes` y `numbered` ya resueltos.

Restricciones que condicionan el diseño:

- Una plantilla **escribe** (su `plan()` corre en la generación, con lock y presupuesto de carátulas); el contexto se
  **lee** en cada request del detalle. Son dos tiempos y dos responsabilidades.
- Los textos visibles no se guardan traducidos: los títulos se derivan al presentar (ADR 0037). El contexto debe seguir
  ese principio.
- Solo llegan a esta página las colecciones **generadas** (`findGeneratedCollection`). Una colección curada es una lista
  de la cuenta curadora y se abre en la página de lista, que este cambio no toca.
- La completitud de claves entre `messages/es` y `messages/en` ya la impone una prueba (`messages.consistency.test`).

## Goals / Non-Goals

**Goals:**

- Que agregar contexto a una colección sea escribir **un presentador y sus textos**, sin tocar la página.
- Un contrato pequeño y declarativo que alcance para tres casos reales: Premios (categoría por disco), Novedades
  esenciales (rango, cartela relativa, agrupación por mes) y la caída por familia de hoy.
- Que la página no tenga ninguna rama por familia ni por plantilla.
- Cero cambio visible en Premios y en las familias; Novedades esenciales gana contexto.

**Non-Goals:**

- Presentadores para el resto de las plantillas: se hacen en cambios siguientes, con el contrato ya probado.
- Cambiar `plan()`, la rotación o la generación.
- Guardar contexto en la base: se calcula al leer.
- Notas escritas a mano por disco.

## Decisions

### 1. El presentador devuelve datos, no texto

`CollectionContext` lleva **referencias a mensajes** (`{ key, params }`), no cadenas:

```ts
interface MessageRef { key: string; params?: Record<string, string | number | DatePart> }
interface DatePart { date: string /* YYYY-MM-DD */; style: "short" | "long" | "day-month" | "month-year" }

interface CollectionContext {
  summary?: MessageRef;                              // la frase de la cabecera
  link?: { href: string; label: MessageRef };        // p. ej. a la página de la ceremonia
  notes: Map<string, MessageRef>;                    // cartela por disco (id del álbum)
  groups?: { label?: MessageRef; albumIds: string[] }[];   // agrupación; sin `label` = sin encabezado
  numbered: boolean;                                 // número de orden sobre la carátula
}
```

Un resolvedor puro (`renderContext`) convierte cada referencia en el texto del idioma activo con la función de
traducción de `catalog.explore.collectionContext`, y formatea cada `DatePart` con `Intl` en UTC (para que la zona del
servidor no corra el día, como hace `formatNoteDate` hoy).

Por qué datos y no texto: los presentadores no necesitan saber el idioma, la prueba de completitud de mensajes cubre
sus textos sin lógica extra, y no hay riesgo de que una traducción quede guardada. Es el mismo principio que
`collectionTitle` (ADR 0037).

Alternativa descartada: que el presentador reciba `locale` y devuelva cadenas. Es más corto al principio, pero mezcla
lectura y traducción, obliga a pasar el idioma por todos los servicios y sus textos quedarían fuera de los catálogos.

### 2. El registro vive aparte de las plantillas

`presenters/index.ts` mapea `templateKey → presentador`; las plantillas (`COLLECTION_TEMPLATES`, `plan()`) **no
cambian**. La pregunta "¿cómo se explica?" no entra en el contrato de `CollectionTemplate`.

Por qué: la plantilla es del lado de escritura (importa la base para generar, corre con lock) y el presentador es del
lado de lectura, en la request de la página. Acoplarlos obligaría a que cualquier ajuste de texto toque el módulo de
generación y a importarlo desde la página. Además una colección puede sobrevivir a su plantilla (una plantilla retirada
del registro conserva su archivo), y entonces debe poder presentarse igual.

El costo es que una clave de presentador puede quedar sin plantilla. Una prueba lo cierra: toda clave del registro de
presentadores existe en `COLLECTION_TEMPLATES`.

### 3. Caída plantilla → familia → nada, y un presentador puede abstenerse

`presentCollection({ templateKey, periodKey, family, albumIds, today })` busca el presentador de la plantilla; si no
hay, el de la familia; si tampoco, devuelve un contexto vacío (sin resumen, sin cartelas, sin numerar), que la página
resuelve con la descripción genérica de la familia.

Un presentador puede **abstenerse** devolviendo `null` (Premios, si la ceremonia ya no está cargada): la cadena sigue
con el siguiente nivel en vez de mostrar un contexto a medias. Es lo que hoy hace la página con
`ceremony ?? collectionNote(...)`, pero ahora dentro del registro.

Por qué no una migración big-bang: hoy hay ocho plantillas y cinco familias; migrarlas todas en un cambio sería
mucho riesgo para poco aprendizaje. Con la caída, las plantillas sin presentador siguen exactamente como están, porque
los presentadores de familia reproducen `collectionNote` palabra por palabra.

### 4. El contrato es lo mínimo que alcanza para tres casos

Qué **puede** pedir un presentador: un resumen, un enlace, una cartela por disco, una partición de los discos en
grupos y si se numeran. Qué **no** puede: elegir discos (eso es `plan()`), cambiar su orden, filtrar, ni pintar
componentes. Los grupos son una partición: `normalizeGroups` descarta ids ajenos y manda los discos sin grupo a un
último grupo sin encabezado, de modo que un presentador defectuoso nunca esconde un disco.

Por qué tan chico: cada capacidad nueva del contrato es una capacidad que todas las páginas deben respetar. Se
agrega cuando un caso real la exige, no antes. `groups` entra ahora porque Novedades la exige; el filtro por tipo no
entra porque nada lo exige todavía.

### 5. El presentador recibe ids y consulta por lote

La entrada es el orden de los discos de la lista (ids de release-group) más la plantilla, el período y la fecha de hoy
inyectable. Cada presentador hace **una consulta por dato, por lote** (`albumReleaseDates(ids)`, `ceremonyContext(…)`),
nunca una por disco. Todo ocurre en la misma request de la página: no escribe, no usa `after()`, no sale a ninguna
fuente externa.

La fecha de hoy se inyecta (UTC) para que las cartelas relativas ("Hace 5 días") se prueben sin reloj.

Un presentador solo aplica a listas de `release-group`; para cualquier otro tipo de entidad no hay presentador (las
colecciones de hoy son todas de álbumes).

### 6. Novedades esenciales: rango real, cartela relativa, meses

El presentador de `new-releases` trabaja sobre las fechas **de los discos que se muestran**, no sobre la ventana
teórica de 90 días: la colección se genera una vez por semana y el rango real puede ser más corto.

- **Resumen:** "Estudio, singles y EPs de los últimos 90 días: del 17 jul al 14 oct." Los extremos son la fecha más
  antigua y la más reciente entre los discos con fecha completa.
- **Cartela:** relativa y con la fecha corta: "Hoy", "Ayer", "Hace 5 días · 9 oct", "Hace 3 semanas · 22 sep".
- **Grupos:** un grupo por mes de lanzamiento, el mes más reciente primero; dentro de cada grupo se conserva el orden
  de la lista (la señal de la plantilla). Los discos sin fecha completa caen al grupo final sin encabezado.

Si esto no cupiera en el contrato, sería la prueba de que el contrato está mal.

### 7. La página pregunta una vez y pinta lo que recibe

`page.tsx` llama a `presentCollection(...)`, a `renderContext(...)` con la traducción del grupo
`catalog.explore.collectionContext`, y pasa el resultado a `CollectionDetailHeader` (resumen y enlace) y a
`CollectionAlbumGrid` (cartelas, numeración y grupos). No importa `ceremonyContext`, `awardNote` ni `collectionNote`.

La cabecera conserva su orden de prioridad: descripción escrita a mano → resumen del presentador → descripción genérica
de la familia. `CollectionAlbumGrid` pinta una sección por grupo (encabezado y las mismas tarjetas) y, sin grupos, se
comporta como hoy.

## Risks / Trade-offs

- **El contrato crece sin control** → Cada capacidad nueva exige un caso real y un escenario en la especificación. El
  contrato no puede elegir discos, ordenarlos ni pintar: eso queda en `plan()` y en los componentes.
- **Una clave de mensaje inexistente se vería cruda** → Una prueba comprueba que todas las claves que emiten los
  presentadores existen en `catalog.explore.collectionContext` de los dos idiomas, y el resolvedor cae a no mostrar
  la cartela antes que mostrar una clave.
- **Un presentador defectuoso esconde discos** → `normalizeGroups` garantiza la partición; las cartelas ausentes solo
  dejan al disco sin cartela.
- **Más consultas en el detalle** → Una por dato y por lote, sobre una lista de unas decenas de discos; el detalle ya
  hace lo mismo con `albumReleaseDates`.
- **Agrupar por mes alarga la página de Novedades** → Son como mucho 12 discos y 3 o 4 meses; los encabezados son de
  una línea y la rejilla no cambia.
- **Presentador sin plantilla o plantilla sin presentador** → Lo segundo es normal (cae a la familia); lo primero lo
  atrapa la prueba de consistencia del registro.
- **"Hoy" depende del reloj del servidor** → Se calcula en UTC y se inyecta; coincide con cómo se formatean las fechas.

## Migration Plan

1. Contrato, resolvedor de mensajes y registro con caída, sin presentadores: la página sigue igual.
2. Presentadores de familia que reproducen `collectionNote`; la página deja de llamarlo.
3. Presentador de Premios con la lógica que hoy está en la página; la página deja de importar `ceremonyContext` y
   `awardNote`.
4. Presentador de `new-releases` y soporte de grupos en `CollectionAlbumGrid`.
5. ADR 0039, documentación y retiro de `collection-notes.ts`.

Sin migración de datos ni de esquema. Reversión: cada paso deja la página funcional; revertir un presentador devuelve
esa colección a la caída por familia.

## Open Questions

- ¿El resumen del presentador también debe servir de `description` de los metadatos de la página (SEO)? Hoy no hay
  descripción en los metadatos; se deja fuera de este cambio.
- Cuando existan más presentadores, ¿conviene que el registro se construya a partir de un archivo por plantilla?
  Con tres presentadores un mapa explícito es más legible; se revisa al llegar a seis o siete.
