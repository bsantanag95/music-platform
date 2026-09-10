## Context

El registro de escucha ya existe entero, solo que atado a páginas de entidad:

- **`MarkAsListened`** (`src/components/diary/MarkAsListened.tsx`): recibe un
  `target: ListenTarget` (`{ type: "artist" | "release-group" | "recording", id }`), llama
  `createListenEntry(target)` al pulsar, y al éxito muestra `ListenEntryForm` para ampliar.
  Sin sesión, enlaza a `/auth/login`.
- **`createListenEntry`** (`src/lib/api/diary.ts` → `POST /api/me/diary`): el handler hace
  `resolveDiaryTarget(type, id)` —que **verifica que la entidad exista en la BD local**, no
  ingiere— y luego crea la entrada, que nace `audience: "private"`.
- **`searchCatalog(query)`** (`GET /api/catalog/search`): devuelve `results`
  (`kind: "artist" | "release-group"`, con `id` local) y un `songContext` opcional
  (`recordingId`, título, artista, álbumes). **El buscador persiste un stub local de cada
  resultado** (`upsertArtistStubsFromSearch`, `upsertReleaseGroupStubs`, y stubs de
  `recording` para `songContext`), así que cualquier `id` que devuelve la búsqueda ya
  resuelve en `resolveDiaryTarget`.
- **`ListenEntryForm`** / **`ReactionPicker`**: el panel de ampliar, reutilizable tal cual.
- **`GetStartedModal`** (`src/components/home/GetStartedModal.tsx`): patrón de modal del
  repo — `createPortal` a `document.body`, focus-trap manual con `Tab`/`Shift+Tab`, `Escape`
  cierra, `body.style.overflow = "hidden"`, foco vuelve al disparador al cerrar.
- **Header** (`regroup-authenticated-header`): barra general `md+` con `HeaderSearch` +
  enlaces a Explorar/Listas; panel móvil con bloque general + bloque de usuario. El
  `currentUser` ya está disponible en el componente.

## Goals / Non-Goals

**Goals:**

- Un control `+ Registrar` en la barra general del Header, solo con sesión, en escritorio y
  en el bloque general del panel móvil.
- Un modal que resuelva "¿qué querés registrar?" con el buscador del catálogo y luego corra
  el flujo crear+ampliar existente, sin duplicar su lógica.
- Cero cambios en el backend: reuso de `searchCatalog`, `createListenEntry`,
  `resolveDiaryTarget`, `ListenEntryForm`.
- Accesibilidad del modal al nivel de `GetStartedModal` (focus-trap, `Escape`, retorno de
  foco, `aria-modal`).

**Non-Goals:**

- Endpoints nuevos, migración, o cambios en el modelo/contrato de la entrada de diario.
- Cambiar que la escucha nazca `private`, o el criterio de audiencia según intención.
- Historial / "registrados recientemente" / atajos sin buscar en el modal.
- Un primitivo `Dialog` compartido y refactor de `GetStartedModal` (se puede después).
- Registrar múltiples objetivos en una pasada.

## Decisions

### 1. Componente: `RegisterListenButton` + `RegisterListenDialog`

`RegisterListenButton` (client) renderiza el disparador y controla `open`. `RegisterListenDialog`
(client) es el modal con las tres fases internas:

1. **Buscar** — input + resultados. Debounce ~300 ms; `searchCatalog(query)` con
   `useEffect` + `useState` + guard `cancelled` (no react-query: el `Header` se monta en
   `layout.tsx` **fuera de `<Providers>`**, así que no hay `QueryClientProvider` en este
   árbol — mismo criterio que `AddToListButton` / `HeaderSearch`). Se dispara con
   `query.length >= 2`. Lista de candidatos: `songContext` primero (si viene) como fila
   "canción", luego `results` (álbumes y artistas). Cada fila es un `<button>` que
   selecciona, no un `<Link>`.
2. **Registrando / ampliar** — al elegir, `createListenEntry({ type, id })`; con la entrada
   creada se muestra `ListenEntryForm` embebido (mismo componente que `MarkAsListened`).
3. **Listo** — estado de confirmación con enlace a `/me/diary` y acción "registrar otra"
   (vuelve a fase 1). Cerrar en cualquier fase descarta el panel de ampliar pero **no**
   deshace la entrada ya creada (append-only, igual que `MarkAsListened`).

El Header solo monta `RegisterListenButton` cuando hay `currentUser`. No hay ruta ni estado
en URL: es un overlay efímero.

**Alternativa descartada:** una ruta `/me/diary/new`. Más pesada, rompe el "quedate donde
estás y anotá", y duplicaría el layout del formulario.

### 2. El disparador vive en la barra general, no en el menú de usuario

Es una **acción**, no un destino. Letterboxd/Backloggd ponen el equivalente ("+", "Log")
visible, no enterrado en el menú de cuenta. Va después de los enlaces de contenido:
Buscador · Explorar · Listas · **`+ Registrar`**. Estilo de botón sutil (borde + `+`), no un
enlace de texto plano, para leerse como acción. En el panel móvil se ubica al final del
bloque de barra general.

### 3. Selección de objetivo: álbum primero, sin tab

El modal no reproduce las pestañas de `/search`. Muestra una sola lista ordenada: canción
(si `songContext`), luego álbumes, luego artistas — el álbum es la "obra" y el caso más
común de registro. Cada fila muestra carátula/monograma + título + subtítulo + tipo, con
`CoverThumb`/`LazyCoverImage` reutilizados.

### 4. Sin sesión

El Header no monta el control sin `currentUser`. Defensa en profundidad: si el modal se
abriera sin sesión (imposible por render, pero por si acaso), `createListenEntry` responde
`401 AUTH_REQUIRED` y el modal muestra un enlace a `/auth/login` — mismo criterio que
`MarkAsListened`.

## Risks / Trade-offs

- **[Latencia del buscador con ingesta de MusicBrainz]** → el primer `searchCatalog` de un
  término nuevo puede tardar (una request a MB por tipo). Mitigación: estado de carga claro,
  el debounce evita disparos por tecla, y es el mismo coste que `/search` ya tiene.
- **[Objetivo ambiguo: registrar "artista" cuando se quería un álbum]** → orden de la lista
  (álbum arriba) + tipo visible en cada fila. No se fuerza a álbum: registrar un artista es
  válido en `listen-diary`.
- **[Focus-trap duplicado con `GetStartedModal`]** → se copia el patrón en vez de extraer un
  primitivo. Deuda menor y contenida; un `Dialog` compartido puede venir después sin tocar
  este flujo.
- **[Modal sobre el Header en móvil]** → `createPortal` a `body` + `z-50` lo saca del flujo
  del Header; el panel plegado del Header se cierra al abrir el modal (se navega/actúa).
