## Why

Hoy la aplicación trata a artista, álbum y canción como entidades con funciones casi
idénticas: las tres se valoran, se comentan, se registran en el diario, se marcan como
favoritas, se ponen en listas y se destacan en el perfil con exactamente el mismo peso.
Esa simetría total no es una jerarquía, es la ausencia de una, y produce dos síntomas:
identidad de producto difusa ("¿otro Last.fm?") y un feed donde toda la actividad pesa
igual. El origen del proyecto —"Letterboxd para música"— nunca se materializó porque
Letterboxd gira alrededor de **una** unidad cultural (la película) y aquí hay tres
compitiendo por el mismo protagonismo.

Este cambio es **exploratorio**: su objetivo es fijar la dirección conceptual y las
decisiones estratégicas previas, no implementar todavía. La implementación se hará en
cambios posteriores acotados, uno por superficie.

## What Changes

- **Principio rector nuevo**: artista, álbum y canción siguen siendo entidades de primera
  clase en el catálogo, pero **dejan de cumplir el mismo trabajo en la experiencia**. El
  rol se asigna a la **acción**, no a la entidad (Modelo C): existen dos modos de relación
  —*Obra* (valorar, reseñar, favorito, lista) y *Consumo* (registrar una escucha con
  fecha)— disponibles sobre las tres entidades, y la jerarquía vive en qué modo la UI
  presenta como **primario por defecto** en cada una.

  | Entidad | Modo primario | Modo secundario disponible |
  |---|---|---|
  | Álbum | Obra: valorar + reseñar | Consumo: registrar sesión completa |
  | Canción | Consumo: registrar + reaccionar | Obra: valorar (tras "más"), favorito |
  | Artista | Exploración + seguir | Obra: nota/contexto (no veredicto), favorito |

- **Separación explícita obra ↔ evento de consumo**: `Obra → Opinión` (una, editable) es
  independiente de `Obra → Escucha → evento temporal` (ilimitadas, append-only). Ya es la
  base de `listen-diary`; se eleva a principio de arquitectura y se propaga al resto.

- **El objeto crítico del álbum es el `release-group`**, no la `release`. Ediciones
  (deluxe, remaster, regional) son detalle de presentación, nunca target social.

- **Reseña como objeto propio** (título + cuerpo + rating embebido), distinta de
  "comentario". Primaria en álbum, permitida en canción, reformulada como
  "nota / contexto / empezá por aquí" en artista (sin veredicto ni estrella).

- **Rating de canción** pasa a interacción secundaria: la reacción cualitativa
  (`liked/loved/obsessed/neutral/disliked`, ya existente en el diario) es el modo primario
  en canción; las estrellas quedan opcionales y detrás de un control "más".

- **Nueva superficie de descubrimiento de álbumes** (editorial primero, señal de
  comunidad después): novedades, por década, por género, mejor valorados, destacados de la
  comunidad. Responde "¿qué obras debería conocer?" frente al feed que responde "¿qué hace
  mi red?".

- **Seguir artista** (usuario → artista), hoy inexistente: en Fase 1 es solo señal de
  afinidad, descubrimiento y organización personal. Notificaciones de lanzamiento quedan
  fuera de alcance (el modelo de datos debe permitirlas después).

- **Feed con jerarquía de eventos en 4 tiers** por intención (expresivo / señal de opinión
  / presencia cotidiana / ambiente-automático), extendiendo el criterio actual
  "tiene texto / no tiene texto" con una segunda dimensión "entidad + tipo de acción".

- **Perfil reorganizado**: sección nueva **"Álbumes favoritos"** (álbum-led, identidad
  cultural) por delante de los *destacados* mixtos actuales de `profile-showcase`, que se
  conservan como capa secundaria más flexible; el himno se conserva. Bloque dinámico
  aparte —"en rotación" derivado del diario, rastro reciente— para *cómo vive la música*.

- **Diario como capa de consumo**, no de opinión: defaults de audiencia por intención
  (escucha sin nota → `private`; con nota/reacción → `followers`), vista de línea de
  tiempo por mes, y renombrar la acción "Marcar como escuchado" → "Registrar escucha".

- **NO se elimina nada** del modelo de datos: ratings de canción, escuchas de álbum y la
  entidad artista se conservan. La jerarquía se prueba primero en presentación.

## Capabilities

Este cambio **no** escribe deltas de spec todavía: es la fase de exploración. Las
capacidades siguientes quedan identificadas como afectadas; cada una se abordará en un
cambio posterior propio una vez resueltas las preguntas abiertas (ver `design.md`).

### New Capabilities

- `album-discovery`: superficie navegable de descubrimiento de álbumes (novedades,
  décadas, géneros, mejor valorados, destacados de comunidad), con fallback editorial para
  arranque en frío.
- `artist-following`: seguimiento unilateral usuario → artista, su gestión y su efecto en
  el feed (lanzamientos) y en el descubrimiento.
- `album-review`: la reseña de álbum como objeto propio (título, cuerpo, rating asociado),
  su edición, su presentación en la página de álbum y su peso en el feed.

### Modified Capabilities

- `activity-feed`: jerarquía de eventos en 4 tiers por intención; distinción entre
  actividad personal / social / relevante / automática.
- `listen-diary`: defaults de audiencia derivados de la intención de la entrada; vista de
  línea de tiempo; renombrado de la acción; refuerzo del principio "el diario no lleva
  opinión".
- `catalog-album`: la reseña sube a acción primaria; el `release-group` es el objeto
  social canónico y las ediciones son detalle de presentación.
- `catalog-artist`: página reordenada a discografía-forward; acción "Seguir artista"; las
  opiniones sobre artista se reformulan como nota/contexto.
- `favorites`: presentación en el perfil separa "álbumes favoritos" (identidad cultural)
  de los favoritos de canción/artista.
- `profile-showcase`: "álbumes favoritos" como sección propia por delante de los cuatro
  destacados mixtos; "en rotación" derivado del diario reciente.
- `taste-fingerprint`: el reparto por tipo y las crestas ponderan la relación obra
  (ratings/reseñas de álbum) frente al consumo (escuchas de canción).
- `home`: los bloques de descubrimiento pueden incorporar álbumes destacados sin
  convertir el Home en una cuadrícula de álbumes.
- `ratings-and-comments` *(archivada; se re-crearía)*: rating de canción como interacción
  secundaria; reacción cualitativa como modo primario en canción.

## Impact

- **Conceptual / documentación**: nuevo principio de arquitectura de información que
  atraviesa casi todas las specs de Fase 5. Hay que documentarlo en `/docs` y mantenerlo
  sincronizado.
- **Modelo de datos**: sin migración destructiva. Aditivo: tabla de seguimiento
  usuario→artista, objeto reseña (posible separación de `comment`), campo/derivación
  "representative album" ya existe para recordings.
- **Catálogo**: exige nailar la canonicalización `release-group` (deluxe/remaster/regional)
  antes de apoyar la capa crítica sobre el álbum.
- **Superficies nuevas**: ruta de descubrimiento de álbumes (`/[locale]/albums` o
  `/[locale]/explore`), con su propia estrategia editorial de contenido.
- **Riesgo estratégico**: el producto intenta ser tres cosas a la vez (crítica ≈ RYM,
  hábito ≈ Last.fm, social ≈ Letterboxd). La secuencia de trabajo debe priorizar la
  intersección diferenciada: crítica + social alrededor del álbum.
- **Decisiones de negocio (Q1–Q7): resueltas** — ver `design.md` → "Resolved Questions".
  Resumen: audiencia amplia con identidad album-led · rating de canción degradado y medido
  · diario manual e intencional · descubrimiento con contenido semilla · `review` como
  entidad propia · seguir artista solo como afinidad · "Álbumes favoritos" como sección
  nueva separada del showcase mixto.
- **Precondiciones técnicas bloqueantes** (Fase 0 en `design.md` → D12): canonicalización
  de `release-group`, contenido semilla del descubrimiento, modelado de `review`.
