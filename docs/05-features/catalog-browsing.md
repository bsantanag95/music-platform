# Catálogo navegable — buscar → artista → álbum

**Fase:** 3 (roadmap). **Estado:** especificado, backend completo y validado — ver
`02-architecture/frontend-plan/` para la implementación de frontend en curso.

Este documento describe el comportamiento del feature desde la perspectiva del producto:
qué ve y qué puede hacer un usuario, en qué estados, y qué casos límite existen. El
contrato técnico exacto vive en `04-api/contracts.md`; las reglas de negocio subyacentes
(identidad de artista, remaster vs. versión nueva, ediciones) en `01-domain/business-rules.md`.

## Alcance de la Fase 3

Solo lectura, sin cuenta de usuario. El flujo completo:

```
Buscar en el catálogo → Resultados → Perfil de artista / Álbum (tracklist + créditos)
```

La vista de detalle de canción quedó fuera de esta fase (Camino A,
`02-implementation-plan.md`, Etapa 3.5); se construyó después, mínima a propósito — ver
"3b. Detalle de canción" más abajo (cambio `rebalance-catalog-detail-pages`).

## 1. Buscar en el catálogo

El usuario escribe un texto y `/search` muestra **todas** las coincidencias de artistas y
álbumes (pestañas **Todo / Artistas / Álbumes**); la persona elige cuál abrir. La búsqueda
no resuelve a un único resultado ni ingiere nada: combina la base local con una sola
request a MusicBrainz por tipo, persiste los candidatos aún no vistos como stubs y ordena
de forma determinista (locales cacheados → resto de locales → solo-MusicBrainz por score,
coincidencia exacta al tope de su grupo). El campo del Header siempre navega a
`/search?q=<consulta>`.

**Estados:**
- **Resultados** — lista de candidatos; cada fila enlaza directo a `/artist/<id>` o
  `/album/<id>`. Un artista o álbum todavía no ingerido se trae **en la vista destino**,
  con su propio estado de carga — la página de resultados nunca habla de "primera
  importación".
- **Sin coincidencias** — lista vacía (`200`, no error): estado vacío propio.
- **Carga** — mientras la página resuelve el `q` de la URL, `loading.tsx` muestra el
  skeleton de la lista y el formulario queda deshabilitado.
- **Error** — solo si MusicBrainz falla y no hay ninguna coincidencia local
  (`INTERNAL_ERROR`): recuperable, con reintento. Distinto de "sin coincidencias".

Los homónimos ("Poison" glam vs. thrash) aparecen como filas separadas con su
disambiguation — la ambigüedad la resuelve el usuario, no `artists[0]`. Búsqueda de
canciones, autocompletado y paginación: diferidos (ver el roadmap y
`openspec/changes/add-search-results-page/design.md` → *Trabajo futuro diferido*).

**Tolerancia a errores de tipeo — limitación conocida (aceptada por ahora).** La base
local coincide por *substring exacto*, sin distinguir mayúsculas (`ILIKE '%texto%'`): no
tolera puntuación, apóstrofes ni palabras cambiadas — `Guns and Roses` no encuentra
`Guns N' Roses` en local, ni `LA Guns` a `L.A. Guns`. Toda la tolerancia a errores viene
de la búsqueda en vivo de MusicBrainz (índice full-text), que está limitada a 1 req/seg,
cuyo ranking varía entre llamadas y se cachea 10 minutos por texto exacto (los fallos no se
cachean). Consecuencias observables:

- Una misma búsqueda mal escrita puede no devolver nada una vez y funcionar al reintentar,
  según haya respondido MusicBrainz esa vez.
- Un artista con discografía ya cacheada localmente **no** muestra la marca "en tu catálogo"
  ni sube en el orden si se llega a él por un nombre mal escrito: entra vía MusicBrainz, en
  el grupo "solo-MB".
- Con MusicBrainz caído, el catálogo propio no es buscable por variantes del nombre.

Se acepta a propósito en esta etapa: con catálogo chico el matching difuso local casi no
dispararía (el artista todavía no está en la base) y el umbral de similitud se calibraría a
ciegas, sin datos de uso. El camino cuando se decida abordarlo —columna normalizada
(`unaccent` + minúsculas + sin puntuación) + índice `pg_trgm`, con el score de similitud
como desempate **dentro** del orden determinista actual, en su propio cambio de OpenSpec—
se revisa antes de una exposición pública o cuando el catálogo tenga volumen real.

## 2. Perfil de artista

Foto, nombre, biografía breve (si existe), y discografía agrupada en cuatro categorías
fijas: **De estudio**, **Singles/EP**, **Compilados**, **En vivo / Misceláneos** — el
diseño ya definido en la visión de producto.

**Discografía-forward** (cambio `rebalance-catalog-detail-pages`): la discografía va
**justo debajo del encabezado**, antes de las acciones de catálogo, las membresías y las
notas de la comunidad. El artista se lee primero por su obra. El área de comunidad del
artista **no tiene rating de estrellas**: son notas cortas de contexto ("empezá por
aquí"), no reseñas.

**Caso Roger Waters / Pink Floyd (referencia del proyecto):** el perfil de un artista
muestra tanto su discografía como banda como su carrera solista en la misma pantalla, sin
distinguir "modo banda" de "modo solista" — es una sola discografía agrupada por
categoría, el hecho de que algunos álbumes sean con una banda y otros en solitario no
cambia la estructura de la pantalla. Ver ADR 0004 (modelo `CREDIT`) para el porqué.

**Artista sin discografía todavía cacheada:** la búsqueda ya no ingiere nada — abre un
artista recién descubierto (stub creado por la búsqueda o por créditos de `feat.`)
dispara `findOrIngestDiscography` en el request que resuelve esta pantalla, con el estado
de carga propio del perfil. Desde la página de resultados, el aviso de "primera
importación" corresponde acá, no a la búsqueda.

**Carátulas:** carga progresiva (lazy) — la grilla de álbumes se renderiza de inmediato
sin carátula, y cada álbum completa la suya en segundo plano apenas es visible. Decisión
ya tomada (Opción C, `00-backend-analysis.md`); nunca bloquear el render inicial de la
página esperando carátulas.

## 3. Detalle de álbum

**Estructura** (cambio `redesign-album-page`, 2026-09 — la página se lee como ficha de
biblioteca, con Metal-Archives como referencia y la capa personal de Letterboxd):

- **Cabecera**, renderizada una vez por un layout común de pestañas: carátula (miniatura de
  250 px como máximo, por licencia), **tipo de obra como antetítulo** (siempre, también
  "Álbum de estudio"), título, **todos los artistas principales** con su `joinPhrase`,
  **ficha técnica** (lanzamiento con la precisión conocida, duración total —con "≥" si falta
  alguna duración—, edición mostrada y, cuando el catálogo lo conozca, sello; solo se pintan
  filas con dato), **bloque de comunidad** (media de estrellas y detallada, valoraciones y
  reseñas, "lo coleccionan / lo buscan" en tres tarjetas —los conteos bajo umbral se ven
  como "<5"—, un enlace "Aparece en N listas" solo si N > 0, e histograma; umbrales en
  `01-domain/business-rules.md`) y el **panel "Tu relación"** (valoración propia, reseña,
  escuchas, favorito, Pendiente, colección y listas, mostrados como estado).
- **Panel "Tu relación"** (cambio `rework-album-relation-panel`, 2026-09): todas las filas
  siempre visibles, sin menú "···" ni "Más acciones", también en móvil. **Nota**: cinco
  estrellas en línea con medias estrellas que guardan con un clic; junto a ellas, un botón
  abre un diálogo con el puntaje detallado limitado al tramo de las estrellas, destacar y
  borrar. Cambiar las estrellas descarta el puntaje detallado (cada valor de estrellas tiene
  su propio tramo, ver `business-rules.md`) y lo avisa. **Escuchas**: conteo y última
  fecha, "+ Registrar" y una confirmación con "Agregar detalles". **Favorito** y
  **Pendiente**: conmutadores con ícono (corazón y marcador). **Listas**: "En N de tus
  listas" (listas y Caminos propios, sin recorridos de artista) y un selector de casillas
  con búsqueda que agrega y quita; las listas de la comunidad que contienen el álbum se
  abren desde el bloque de comunidad, no desde el panel.
- **Pestañas con URL propia** (slugs en inglés): `/album/{id}` (Canciones, siempre la
  pestaña por defecto), `/album/{id}/reviews` (Reseñas, con contador), y `/credits` y
  `/editions`, que se muestran solo cuando el cambio de datos
  `enrich-album-editions-and-credits` las alimente.
- **Pestaña Créditos** (cambio `compact-album-credits`, 2026-09): el primer nivel se rotula
  "Artista principal" cuando todos los artistas principales son personas e "Integrantes de
  la banda" en los demás casos, y está siempre visible. Músicos invitados y Producción y
  sonido se muestran abiertos con hasta 6 personas; con más, contraídos con la cantidad y
  los tres primeros nombres. Arte y otros sigue contraído. Cada fila muestra 4 roles y
  "+N" para el resto, con las pistas en línea propia. Los modificadores de MusicBrainz no
  se muestran como roles: `additional`/`guest` se omiten en instrumentos y voces, `solo` es
  un matiz, y los demás forman etiquetas compuestas ("coproducción"); `membranophone` se
  lee "percusión".
- **Al pie**, fuera de las pestañas: franja de discografía del artista principal (mismo
  tipo de obra, orden cronológico, anterior / siguiente) y **comentarios**.
- **Móvil**: carátula e identidad, línea resumen de comunidad, panel (mismas filas que en
  escritorio), ficha técnica colapsable, pestañas.

**Pestaña Canciones:** tracklist de la edición representativa con posición, título completo
(sin truncar), duración, subtotal por disco y total. Cada pista muestra su variante
(en vivo, remix, regrabación, con enlace a la original), el artista cuando no es el del
álbum (recopilaciones), la marca de **favorita de la comunidad** (hasta 3 pistas con al
menos 5 reacciones `loved`/`obsessed` públicas; no hay media de estrellas por pista) y, con
sesión, si ya la escuchaste. El menú "···" ordena las acciones según el Modelo C: registrar
escucha y reaccionar primero; después valorar, favorito y listas; al final, ir a la canción.

**Créditos (`feat.`):** cada canción con colaboración muestra el crédito reconstruido
(ej. "Pink Floyd feat. Roger Waters"), enlazado al perfil del artista credited. Un track
sin créditos adicionales (el caso normal) no muestra nada extra — el crédito solo aparece
cuando aporta información sobre-y-encima del artista principal del álbum.

**Álbum sin ediciones ingeribles:** MusicBrainz no tiene ninguna `release` utilizable para
ese `release_group`. Estado vacío claro, no una pantalla en blanco ni un error genérico
(`NO_EDITIONS_FOUND`).

**Ediciones alternativas (japonesa, remaster, deluxe):** hoy se ingiere y muestra una sola
edición por álbum. Decidido en `redesign-album-page`: las ediciones **no** tienen página
propia ni cambian la tracklist principal; se listan en la pestaña Ediciones y las pistas
que agregan las ediciones ampliadas se muestran en secciones desplegables de la pestaña
Canciones. Los datos llegan con `enrich-album-editions-and-credits`.

## 3b. Detalle de canción — página mínima

Fuera del alcance original de Fase 3; añadida y **deliberadamente mínima** por el cambio
`rebalance-catalog-detail-pages` (Fase 1 de `redefine-content-hierarchy`). La canción sigue
siendo entidad real, pero su página no es un destino rico: la inversión va al álbum.

La página lidera con **el o los álbumes que contienen la canción** (carátula + título +
año, enlace al álbum; el más temprano marcado como "aparición principal"). Después: título
y artista acreditado, acciones de catálogo (registrar escucha, favorito, agregar a lista),
**tu historial de escuchas** de esa canción (solo con sesión y ≥1 escucha), la **reacción
agregada pública** de la comunidad, comentarios, la divulgación de estrellas plegada, y por
último una **ficha técnica** (`<details>` plegado) con los créditos completos y todas las
ediciones. Sin bloque de reseñas. Ver `ratings-and-reviews.md` para reacción vs. estrellas.

## 4. Navegación por membresías (banda → integrantes) — diferida a Fase 4

**Problema detectado en la Etapa 3.6.** Los créditos del tracklist solo hacen navegables a los
artistas con rol `featured` (colaboraciones). En un álbum de una banda, los integrantes —p. ej.
Roger Waters en un álbum de Pink Floyd— **no figuran como `featured`** en MusicBrainz: el
`artist-credit` de cada canción es únicamente la banda. Por eso no existe un enlace desde el
álbum hacia el perfil del integrante. Se verificó con datos reales: Roger Waters tiene **0
créditos `featured`** en toda la base. Además, la discografía del perfil
(`findOrIngestDiscography`) solo incluye álbumes donde el artista aparece directamente en el
`artist-credit`, así que tampoco muestra los álbumes de las bandas a las que pertenece la persona.
Como consecuencia, el caso de referencia del proyecto ("doble discografía solista y de banda") no
queda completo con los créditos de canción.

**Solución implementada.** Implementar la navegación por membresía usando la tabla `membership`
(persona ↔ grupo, ver `03-data/sql-model.md`):

- El perfil de un **grupo** muestra a sus integrantes, con enlaces a cada perfil de persona.
- El perfil de una **persona** muestra su discografía solista **y** la de los grupos a los que
  pertenece, en la misma pantalla y agrupada por categoría — exactamente lo que define
  `01-domain/domain-model.md` y el ADR 0004.
- La consulta de discografía por membresía **completa** a `findOrIngestDiscography`, no lo
  reemplaza: se conserva el patrón de cacheo bajo demanda y no se añaden llamadas extra a
  MusicBrainz para resolver la pertenencia (la relación vive en la base propia).

La primera visita a un artista con `memberships_synced_at` nulo solicita sus `artist-rels` una sola
vez, filtra `member of band`, consolida roles y fechas conocidas, y persiste la relación de forma
idempotente. La ingesta ocurre antes de leer memberships y antes de componer la discografía. La
sincronización se ejecuta en una transacción con lock por artista: reconcilia relaciones ausentes sin
afectar memberships de otros artistas y marca el flag solo al terminar. Si la llamada externa falla,
la transacción revierte y la marca permanece nula para permitir reintentar; una lectura ya sincronizada
es exclusivamente local.

Esta extensión pertenece a Fase 4, acompaña el trabajo sobre las vistas de artista/álbum/canción y
no depende de autenticación.

## Casos límite conocidos (heredados del modelo de datos)

- **Re-grabación, remix o versión en vivo** de una canción aparecen como una entrada
  separada en el tracklist de su propio álbum — nunca se fusionan con la canción original,
  ni siquiera visualmente (son `RECORDING` distintos por diseño, ver `business-rules.md`).
- **Remaster de audio** de una canción existente **no** genera una entrada nueva en
  ningún listado — es la misma canción, mismo `RECORDING`, sin importar la edición.
- **Artista credited aún no visitado** (`type = 'unknown'`): si un usuario llega al perfil
  de un artista que solo existía como stub de un crédito ajeno, se enriquece automáticamente
  antes de responder — nunca debería verse un perfil con datos "a medias" en pantalla.

## Fuera de alcance de este documento

Valoración, comentarios, listas, favoritos y actividad social — ver
`ratings-and-reviews.md`, `lists-and-favorites.md` y `activity-feed.md` (Fases 4-5).

## Internacionalización (i18n)

El catálogo navegable soporta múltiples idiomas (español e inglés inicialmente). La
internacionalización aplica únicamente al *chrome* de la interfaz — etiquetas de UI,
botones, mensajes de estado y error. Los datos del catálogo musical (nombres de artistas,
títulos de álbumes/canciones, biografías) **no se traducen** y se muestran tal cual
llegan de MusicBrainz. Ver `02-architecture/i18n.md` para la arquitectura completa.
