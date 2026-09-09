## Context

- `AnonymousHome` (`src/components/home/AnonymousHome.tsx`) compone hoy: `<AnonHero>`
  (muro de carátulas + 3 líneas de propuesta de valor + CTA de registro) → grilla
  `CommunityActivity` + `PublicLists` → enlace a `/users` → `PopularComments` →
  `HomeReleases` → `HowItWorks` (carrusel de 9 funcionalidades) → `AnonCta`.
- `add-album-discovery` construyó la capa editorial de álbumes: `listFeaturedCollections()`
  (listas públicas de la cuenta curadora `exploracion`, con carátulas), `listTopRated()`
  (álbumes con ≥ `MIN_RATINGS_PER_ALBUM` valoraciones, devuelve `[]` si hay menos de
  `MIN_ALBUMS_FOR_SECTION` elegibles), y los componentes `CollectionRail` / `AlbumRail`
  (ambos colapsan con lista vacía).
- `/explore` está detrás de `isExploreEnabled()` — **apagada en producción** por defecto
  hasta que la siembra tenga contenido; con el flag apagado la ruta redirige a Inicio y el
  enlace desaparece de la navegación.
- El `home` spec ("Contenido de Inicio diferenciado por sesión") fija que sin sesión se
  muestran tagline + hero + carrusel, y NO contenido propio. No fija el copy exacto ni el
  orden de los bloques de descubrimiento.
- El Inicio autenticado (`AuthenticatedHome`) lidera a propósito con el contenido propio
  (feed / rastro / retomar lista); los bloques de descubrimiento van debajo.

## Goals / Non-Goals

**Goals:**

- Que la primera impresión del visitante nuevo comunique "el álbum es una obra; acá se lo
  valora, se lo reseña y se lo descubre por personas", no "tracker social".
- Asomar la capa editorial de álbumes (`/explore`) en el landing, sin duplicarla.
- Robustez: el bloque funciona con o sin `/explore` habilitado y con o sin datos.
- Cero migración, cero endpoint nuevo, cero cambio en el Inicio autenticado ni en `/explore`.

**Non-Goals:**

- Convertir el landing en una cuadrícula de álbumes (la dirección lo prohíbe explícitamente).
- Bloque editorial en el Inicio autenticado.
- Traer todos los rieles de `/explore` (décadas, géneros, novedades, más reseñados) — el
  landing muestra una **muestra**, no una segunda portada.
- Reordenar el carrusel de funcionalidades — registrar una escucha es la entrada de baja
  fricción (Q1); liderar con crítica sobre-indexaría el perfil de nicho.
- Tocar la estructura del hero o su CTA — solo su copy.

## Decisions

### D1 — Bloque de álbumes justo debajo del hero

En `AnonymousHome`, entre `<AnonHero>` y la grilla `CommunityActivity`/`PublicLists`. Es la
posición que sigue a la propuesta de valor: primero la obra, después la prueba social. El
resto de la página no se reordena.

### D2 — Dos sub-rieles reutilizando componentes de `/explore`

1. **`<CollectionRail>`** con `listFeaturedCollections()` — **solo si `isExploreEnabled()`**.
   Con el flag apagado no se resuelve la consulta ni se renderiza: enlazar a listas de la
   cuenta curadora cuando `/explore` redirige sería incoherente.
2. **`<AlbumRail>`** con `listTopRated()` — sin gate. `listTopRated` ya devuelve `[]` bajo
   el umbral de álbumes elegibles, y `AlbumRail` colapsa con `[]`.

Cada uno colapsa por su cuenta. Si ambos quedan vacíos, no hay bloque (ni encabezado
contenedor). Los componentes se usan **verbatim** — no se crean variantes.

*Alternativa descartada:* un componente nuevo "muro de álbumes del landing". Reusar
`CollectionRail`/`AlbumRail` mantiene una sola implementación y el mismo lenguaje visual
que `/explore`.

### D3 — Reencuadre del copy del hero (contenido, no estructura)

`heroLine1-3` + `anonSubtagline` en `es` y `en`. De "registrá / guardá favoritos / seguí" a
la relación consciente con la música:

- Línea 1: el álbum como obra (no como playlist).
- Línea 2: valorar, reseñar, registrar — el arco de la relación con una obra.
- Línea 3: descubrimiento por personas.
- `anonSubtagline`: una frase que ate las tres ideas y mencione que el descubrimiento pasa
  por personas, no por un algoritmo.

`heroCta`, `anonSearchPrompt`, `anonClosingTitle` y el carrusel de funcionalidades no
cambian.

### D4 — El Inicio autenticado no se toca

`AuthenticatedHome` sigue liderando con contenido propio. La capa editorial de álbumes en
el Inicio con sesión es otra discusión (el usuario logueado ya tiene `/explore` en el
Header y su feed arriba).

### D5 — Sin servicio nuevo

`AnonymousHome` importa `listFeaturedCollections`, `listTopRated` de
`@/services/discovery/discovery` y `isExploreEnabled` de `@/lib/config/discovery`, y suma
las consultas a su `Promise.all` existente (condicionando la de colecciones al flag). Los
rieles necesitan `categoryLabels` (de `catalog.artist.categories.*`) y `coverLabel`.

## Risks / Trade-offs

- **[El bloque queda vacío en una instancia joven]** → Es aceptable y honesto: sin álbumes
  con suficientes valoraciones y sin `/explore` habilitado, el landing conserva el hero
  reencuadrado (siempre visible) + la prueba social. El bloque aparece cuando hay señal.
- **[Dos consultas más en el render del landing anónimo]** → `listTopRated` es una
  agregación con `having` sobre `rating` (indexado); `listFeaturedCollections` es chica
  (listas de una cuenta). Se suman al `Promise.all`, sin serializar. El landing anónimo no
  tiene la presión de latencia del feed.
- **[El copy del hero puede sonar elitista]** → Se evita: línea 2 nombra "registrar" junto
  a valorar/reseñar (la capa de baja fricción sigue presente), y la subtagline no exige
  reflexión previa. Mismo equilibrio que Q1.
- **[Incoherencia si `/explore` se apaga con el bloque ya visto]** → El gate
  `isExploreEnabled()` cubre las colecciones; `listTopRated` no enlaza a `/explore`, enlaza
  a páginas de álbum, que siempre existen.

## Migration Plan

Sin migración. Cambio de composición de un Server Component + i18n. Rollback = revertir el
commit. Sin feature flag propio: el bloque se auto-oculta sin contenido, y las colecciones
ya respetan `isExploreEnabled()`.

## Open Questions

- **OQ1 — ¿El bloque editorial va solo en el Inicio anónimo, o también en una sección de
  descubrimiento del Inicio autenticado? → propuesta: solo anónimo.** El Inicio con sesión
  lidera con contenido propio a propósito; sumar una capa editorial ahí es otra iteración.
- **OQ2 — ¿Qué rieles? ¿Solo colecciones + mejor valorados, o también novedades / más
  reseñados / décadas? → propuesta: colecciones + mejor valorados.** El landing muestra una
  muestra que invita a `/explore`, no una segunda portada.
- **OQ3 — ¿Cuánto empujar el copy del hero? → propuesta: reencuadre moderado** — álbum como
  obra + relación consciente + descubrimiento por personas, en las mismas 3 líneas + la
  subtagline. Sin tocar estructura ni CTA.
- **OQ4 — ¿Reordenar el carrusel de funcionalidades para liderar con rating/reseñas? →
  propuesta: no.** Registrar una escucha es la entrada de baja fricción (Q1).