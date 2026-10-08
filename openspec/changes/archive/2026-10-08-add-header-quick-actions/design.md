## Context

La barra general del Header muestra, con sesión, `RegisterListenButton` (`src/components/diary/`), que abre
`RegisterListenDialog`: buscador con conmutador de tipo (álbum / canción / artista) → elegir resultado →
`createListenEntry` → `ListenEntryForm` para ampliar. Es la única acción de escritura con atajo global.

Piezas ya disponibles y reutilizables:

- Escritura sin estado de servidor: `createListenEntry`, `saveRating(target, id, { stars, detailedScore? })`,
  `createList`, `addItemToList`, `AddToListPanel` (lista las propias compatibles con el tipo del objetivo, agrega y
  además crea listas y Caminos), `StarRatingInput`, `isScoreCoherent`.
- El Header vive **fuera de `<Providers>`** (sin `QueryClientProvider`): el diálogo actual ya hace sus peticiones a
  mano con `useEffect`. Todo lo que se monte en el diálogo debe funcionar así. Los componentes citados arriba no
  usan React Query, por lo que se pueden montar.
- `POST /api/me/favorites` y `POST /api/me/want-to-listen` **alternan**: si el objetivo ya está marcado, lo quitan
  (`toggleFavorite` / `toggleWantToListen` en los servicios). `contracts.md` los describe como idempotentes; el
  código manda (ADR 0006). Las páginas de catálogo lo resuelven hidratando `initialActive` con `isFavorited` /
  `isWantToListen`. El diálogo no tiene esa hidratación.
- `GET /api/me/release-groups/[id]/marks` (`extend-album-quick-actions`) da las marcas, pero solo de discos.

Restricciones de dominio que condicionan el diseño: Pendiente (`want_to_listen_entry`) solo admite artista y
álbum, no canción; las listas son de un solo tipo de entidad; un `rating` exige coherencia estrellas ↔ puntaje
detallado (`CHECK`); el tipo `recording` del buscador de canciones es la grabación identidad de la canción.

## Goals / Non-Goals

**Goals:**

- Un diálogo con seis acciones (Escucha, Valorar, Favorito, Pendiente, A lista, Nueva lista) que cumpla un máximo
  de tres pasos desde cualquier página.
- Mantener el camino de registrar escucha idéntico en costo al actual.
- No quitar nunca una marca por accidente.
- Un único buscador de objetivos compartido, no uno por acción.

**Non-Goals:**

- Colección, Caminos y recorridos de artista (segunda tanda).
- Icono "+" móvil fuera de la hamburguesa y atajo de teclado.
- Tocar los paneles "Tu relación", `ListForm`, los menús "…" o contratos de escritura existentes.

## Decisions

### D1 — Un solo diálogo con chips de acción, no un menú de verbos ni un diálogo por acción

El control abre un diálogo con una fila de chips (radiogroup, mismo patrón y estilo que `SearchTypeToggle`):
Escucha · Valorar · Favorito · Pendiente · A lista · Nueva lista. El chip activo decide el panel de debajo.

*Alternativa descartada: un menú de verbos que abre un diálogo por verbo.* Pone un paso más delante de la
acción más frecuente (clic en "+" → elegir verbo → escribir) y rompe "registrar escucha sin fricción".
*Alternativa descartada: buscar primero y luego elegir acción sobre el resultado* (mostrar el panel "Tu relación"
completo): reutilizaría más UI pero pesa en un modal y mezcla acciones que exigen distinto tipo de objetivo
(Pendiente no admite canciones). Queda como evolución posible.

### D2 — Abre siempre en Escucha; no se recuerda el último chip

Si se recordara el último chip, el mismo botón abriría en sitios distintos y "Escucha" dejaría de ser un camino
garantizado de clic + escribir. Como el costo de cambiar de chip es un clic, se prefiere la previsibilidad.
Se reconsidera si el uso real muestra que se repite siempre otra acción.

### D3 — Estructura: `src/components/quick-actions/`

```
QuickActionsButton.tsx        control del Header ("+ Añadir"), monta el diálogo
QuickActionsDialog.tsx        portal, focus-trap, Escape, chips, estado del chip activo
ActionChips.tsx               radiogroup de acciones (flechas, aria-checked)
TargetPicker.tsx              buscador compartido: tipo + debounce + resultados → onPick(target)
panels/ListenPanel.tsx        createListenEntry + ListenEntryForm (lógica actual, movida)
panels/RatePanel.tsx          marks → StarRatingInput → saveRating
panels/MarkPanel.tsx          Favorito y Pendiente (parametrizado)
panels/AddToListStep.tsx      AddToListPanel sobre el objetivo elegido
panels/NewListPanel.tsx       título + tipo → createList sin audiencia
```

`TargetPicker` se extrae de `RegisterListenDialog` sin cambiar su comportamiento (debounce 300 ms, mínimo 2
letras, estados cargando / error / vacío, un tipo por búsqueda). Recibe los tipos permitidos (`album`, `song`,
`artist`); Pendiente pasa solo `album` y `artist`. `RegisterListenDialog` y `RegisterListenButton` se retiran y
sus pruebas migran al componente nuevo, para no dejar dos diálogos que diverjan.

Cada panel con objetivo recibe el `PickTarget` y gestiona sus estados de carga / éxito / error con
`ApiError.code`, nunca el mensaje crudo. Al cambiar de chip se descarta el objetivo elegido pero se conserva el
texto de búsqueda y el tipo si el nuevo chip los admite (el caso típico: buscar un álbum y luego decidir
valorarlo en vez de registrarlo).

### D4 — Aplicación inmediata con "Deshacer" y estado previo

Para Favorito y Pendiente, elegir un resultado **aplica la marca al instante**, igual que Escucha crea la entrada
al elegir (un clic, no dos). Como `POST` alterna, el panel hace primero `GET /api/me/marks`:

- Sin marca → `POST` (queda marcado) → "Agregado a favoritos" + **Deshacer** (`DELETE`, idempotente).
- Ya marcado → no se muta; se muestra "Ya está en tus favoritos" + **Quitar** (`DELETE`).

El paso previo es una lectura barata y evita el bug de quitar por accidente lo que se quería agregar.
*Alternativa descartada: hacer `POST` a ciegas y mirar si volvió `null`.* Ya habría quitado la marca cuando la
persona descubre el resultado. *Alternativa descartada: agregar una variante idempotente del `POST`.* Cambia un
contrato existente y exige tocar sus llamadores; la lectura previa es aditiva.

Valorar usa la misma lectura para precargar las estrellas actuales.

### D5 — Nuevo endpoint `GET /api/me/marks?type=&id=`

`type` ∈ `artist` | `release-group` | `recording`. Respuesta:
`{ favorite: boolean, pending: boolean | null, stars: number | null, detailedScore: number | null }`
(`pending` es `null` para canciones: no aplica). Sin caché (`Cache-Control: no-store`), requiere sesión, `400`
`VALIDATION_ERROR` si el tipo o el id no son válidos, `404` si el objetivo no existe. Servicio
`src/services/catalog/target-marks.ts` que compone `resolveSocialTarget`, `isFavorited`, `isWantToListen` y
`getOwnRatingRow`. El esquema Zod vive en `src/lib/api/schemas.ts` y el cliente en `src/lib/api/marks.ts`
(`apiFetch` + Zod).

*Alternativa descartada: reutilizar `.../release-groups/[id]/marks`.* Solo cubre discos y trae listas y escuchas
que aquí no hacen falta. No se modifica ni se reemplaza: sigue sirviendo al menú "…". El endpoint nuevo es
deliberadamente más chico.

### D6 — Valorar conserva el puntaje detallado si sigue siendo coherente

Al tocar estrellas se guarda al instante. Si ya existe un puntaje detallado y `isScoreCoherent(stars, score)`
se envía junto; si no, se envía solo `stars` y se avisa con el mismo texto que el panel del álbum
("scoreDropped"), porque el `CHECK` de `rating` rechazaría la combinación. Es la lógica de
`AlbumRelationPanel.rate`; se replica en el panel nuevo sin refactorizar el panel existente (fuera de alcance).
Se registra en las tareas como candidato a helper compartido si aparece un tercer consumidor.

**Puntuación 1–100 como campo opcional (ajuste tras revisión).** La doble valoración es el mecanismo central del
producto (PRODUCT.md), así que Valorar sin puntaje detallado quedaba cojo. Bajo las estrellas va un campo numérico
"Puntuación (1–100, opcional)", precargado con el puntaje vigente. Al confirmar (Enter o al salir del campo) se
envía **solo** `{ detailedScore }`: `upsertRating` deriva las estrellas (`starsFromScore`) y la respuesta decide
el valor que se muestra, de modo que nunca se envía una combinación incoherente y no hay que reimplementar el
`CHECK`. Es el mismo criterio de "puntuar con el número" del panel del álbum. Un valor fuera de 1–100 o no entero
se rechaza en el campo sin llamar al servidor. Tocar estrellas conserva o suelta el puntaje como arriba. Como el
servidor no devuelve el estado en `saveRating`, el panel relee las marcas con `getTargetMarks` tras guardar un
puntaje para mostrar las estrellas derivadas.

El diálogo no edita la reseña ni el comentario: tras guardar se enlaza a la página del objetivo para ampliar.

### D7 — A lista reutiliza `AddToListPanel`

Tras elegir el objetivo se monta `AddToListPanel` tal cual. Ya filtra las listas compatibles con el tipo, agrega
y ofrece crear una lista nueva (y Caminos para álbumes). No se agrega lógica nueva.

### D8 — Nueva lista no pregunta la audiencia

Formulario mínimo: título (obligatorio) y tipo de entidad (artistas / álbumes / canciones). `createList` se llama
**sin** `audience`, de modo que el servidor aplica `resolveNewContentAudience` (la audiencia por defecto de la
persona). `ListForm` no sirve tal cual: inicializa `audience` en `"followers"` y lo envía siempre, lo que pisaría
la preferencia. Se crea un formulario propio y chico en lugar de añadir un modo compacto a `ListForm` (que
quedaría con dos comportamientos y no se toca por alcance).

Al crear: "Lista creada" con **Ver lista** (`/me/lists/{id}`) y **Agregar a esta lista**, que cambia al chip
"A lista" con el tipo de búsqueda fijado al de la lista. Esto es necesario porque el detalle de una lista no tiene
buscador de catálogo (criterio de `rework-list-detail`); sin ese paso, "crear una lista" terminaría en una lista
vacía que obliga a salir del diálogo. La lista nueva aparece en `AddToListPanel`; no queda preseleccionada
(evita cambiar el panel).

### D9 — Nombre, i18n y accesibilidad

El control pasa a "Añadir" / "Add" (el "+" sigue como prefijo decorativo): "Registrar" ya no describe seis
acciones y era ambiguo junto a "Registrarse". Namespace nuevo `quickActions` (es/en) registrado en
`src/i18n/request.ts`; las claves `diary.global.*` se mueven allí. El diálogo conserva la accesibilidad actual
(portal, focus-trap, Escape, retorno de foco, bloqueo de scroll) y los chips son un radiogroup con flechas.

### D10 — Ubicación: zona de usuario, junto al menú (ajuste tras revisión)

El Header se divide en una izquierda para explorar (lo que el sitio ofrece a cualquiera) y una derecha con la
interacción del usuario. "Añadir" escribe datos propios, así que va a la derecha, **inmediatamente antes del menú
de usuario**: `ES EN` · `+ Añadir` · `Nombre ▾`. Así la regla "el + escribe, el menú ve y gestiona" queda
visible: los dos controles son vecinos y uno es el atajo de acción del otro. El selector de idioma, que es una
preferencia, queda más afuera. El ancho no cambia (el botón solo se mueve) y el requisito de ~835 px a `lg` se
mantiene.

En el panel móvil pasa del bloque de navegación general a la cabeza del bloque de usuario, antes de los accesos del
menú. *Alternativa descartada: dejarlo en la barra general, tras los enlaces de contenido* (la ubicación de
`RegisterListenButton`): mezcla una acción de escritura con enlaces de descubrimiento que funcionan sin sesión, y
obliga a explicar por qué un control que solo existe con sesión vive en la zona pública.

## Risks / Trade-offs

- **[Un diálogo con seis acciones puede sentirse pesado]** → El chip Escucha queda preseleccionado y la UI de cada
  panel es mínima; el resto cuesta un clic más. Si la carga cognitiva molesta, se reduce la fila a los usados.
- **[Dos filas de chips (acción y tipo) pueden confundir]** → La fila de tipo solo aparece en acciones con
  objetivo y se pliega a una línea; Nueva lista tiene su propio selector de tipo dentro del formulario.
- **[Mostrar un favorito/Pendiente aplicado sin pedir confirmación]** → Mismo criterio que registrar una
  escucha al elegir; "Deshacer" lo cubre y el estado previo evita quitar por error.
- **[Condición de carrera entre la lectura de marcas y el `POST`]** → Aceptada: el efecto peor es que alterne una
  marca creada en otra pestaña entre ambos pasos; el estado final se muestra siempre desde la respuesta.
- **[Duplicar la lógica de valoración del panel del álbum]** → Mantenida a propósito para no refactorizar fuera de
  alcance; queda anotada como candidata a helper.
- **[`contracts.md` documentaba el `POST` como idempotente]** → Se corrige en este cambio; no hay cambio de
  comportamiento, solo de documentación.

## Migration Plan

Sin migraciones ni datos. Despliegue en un solo paso; la reversión es revertir el cambio (el endpoint nuevo es
aditivo y nada más lo consume). Como `RegisterListenDialog` se reemplaza, las rutas y contratos de
`POST /api/me/diary` no cambian.

## Open Questions

- ¿"Añadir" o "Agregar" como rótulo? El código usa ambos ("Agregar a lista", `addItem`); se propone "Añadir" por
  brevedad en la barra y se ajusta si se prefiere unificar con el resto.
- Colección y Caminos en la segunda tanda: confirmar entonces qué se pide en el paso mínimo (formato de la edición
  en Colección; solo el nombre en Caminos).
