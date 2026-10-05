## Why

La página de género (`/genre/<slug>`, cambio `show-genres`) es una cabecera con tres filas de chips, 12 artistas como chips de texto y una grilla de álbumes paginada en un orden que la persona no puede cambiar. No dice qué es el género, no muestra ninguna señal de la comunidad (valoraciones, reseñas, listas), no ofrece filtros ni búsqueda y no se relaciona con quien la visita. Ahora que la taxonomía, las semillas y los votos de género existen (`add-genre-taxonomy`, `show-genres`, `add-genre-votes`), el género debe ser una **puerta de entrada**: qué es, qué escuchar primero y qué hace la comunidad con él.

## What Changes

**Estructura (Fase 1, base de todo lo demás)**

- La página pasa a una **cabecera fija** y **cuatro pestañas** server-rendered por `?tab=`: Resumen (por defecto), Álbumes, Artistas y Listas. No hay pestaña de canciones.
- **Cabecera con cifras**: álbumes y artistas del género (con subgéneros), media y cantidad de valoraciones, década de auge. Las cifras de comunidad respetan los umbrales de `album-community-stats`.
- **Árbol "Dónde encaja"**: padre → género → subgéneros **con su cantidad de álbumes y ordenados por tamaño** (hoy por slug), más géneros cercanos. Reemplaza las tres filas de chips.
- **Resumen**: rieles "Esenciales" (mejor valorados del subárbol) y "Novedades", tarjetas de artistas con foto y barras "Por década" que enlazan al listado filtrado. Cada riel tiene "Ver todo →" hacia su pestaña. Toda sección se **omite** bajo su umbral (regla en código, no en la UI).
- **Pestaña Álbumes**: búsqueda dentro del género, filtros por tipo (estudio, single/EP, compilación, en vivo), década y subgénero (con interruptor "incluir subgéneros"), orden (mejor valorados, más valorados, más recientes, más antiguos, A–Z) y vista cuadrícula/lista, todo en la URL y paginado en servidor.
- **Pestaña Artistas**: tarjetas con foto, orden por álbumes del género o alfabético, búsqueda y paginación (hoy solo 12 chips sin enlace a más).

**Comunidad y personalización (Fase 2)**

- **Pestaña Listas** y riel en el Resumen: listas públicas con al menos 3 álbumes del género, por guardados, con las mismas exclusiones por bloqueo y visibilidad que el descubrimiento de listas.
- **Reseñas recientes del género** en el Resumen: reseñas visibles de álbumes del género, con la misma visibilidad que en la página del álbum.
- **"Tu huella en el género"** (solo con sesión): álbumes del género que valoraste, tu media, tus 3 favoritos y tus pendientes del género.
- **"Me mueve"** (con sesión): alta y baja del género en "Géneros que me mueven" desde la propia página, con el tope de 5. **Nuevo endpoint idempotente** `PUT/DELETE /api/me/profile/genres/{slug}` para no pisar cambios hechos en otra pestaña (el `PUT` existente reemplaza la lista completa). Cifra "les mueve a N personas" solo desde 5 y solo de perfiles accesibles.

**Sobre el género (Fase 4)**

- Párrafo introductorio y descripción corta del género desde **Wikipedia**, por idioma (es/en) y sin traducción automática, alcanzado **solo** por el `wikidata_id` que la taxonomía ya guarda (la identidad del ítem sale de P8052, una declaración atada al MBID, nunca de buscar por nombre). Se sincroniza en segundo plano con vigencia de 30 días, un fallo conserva lo guardado y se muestra con atribución CC BY-SA. Nueva tabla de textos por idioma, nuevo ADR que extiende el 0021 y un script de relleno.

## Capabilities

### New Capabilities

- `genre-page-overview`: cabecera con cifras, árbol con conteos, rieles Esenciales y Novedades, barras por década y reglas de omisión por umbral.
- `genre-page-catalog`: pestañas Álbumes y Artistas con búsqueda, filtros, orden, vista y paginación por URL.
- `genre-page-community`: pestaña y riel de listas de la comunidad y reseñas recientes del género.
- `genre-page-personal`: "Tu huella en el género", el botón "Me mueve" con su endpoint y la cifra de personas que lo declaran.
- `genre-about`: texto introductorio del género desde Wikipedia (almacenamiento por idioma, sincronización, atribución y retiro).

### Modified Capabilities

- `genre-pages`: la página pasa a cabecera + pestañas con contrato de URL (`?tab=`, parámetros de filtro), el árbol sustituye las filas de chips, y los artistas pasan de chips a tarjetas con listado completo. Se mantienen 404 de slug inválido o no estilo y 308 de mayúsculas.

## Impact

- **Código**: `src/app/[locale]/(catalog)/genre/[slug]/page.tsx`; `src/components/genres/GenrePageView.tsx` se parte en componentes por sección; `src/services/genres/page.ts` se parte en lecturas por sección (estadísticas, álbumes, listas, reseñas, personal); `src/services/discovery/discovery.ts` generaliza `listAlbumsWhere` (filtros y orden); nuevo `src/services/genres/about.ts` y cliente de sincronización que reutiliza `src/services/wikimedia/client.ts`.
- **API**: un endpoint nuevo (`/api/me/profile/genres/{slug}`) con `docs/04-api/contracts.md` y `errors.md` actualizados. Ningún contrato existente cambia.
- **Datos**: una migración nueva (`genre_localized_text` y marca de sincronización en `genre`), espejo en `src/db/schema.ts` y `docs/03-data/sql-model.md`. Sin cambios a tablas existentes más que esa marca.
- **Docs**: ADR 0027 (extiende 0021 a los géneros), `docs/03-data/data-licensing.md` (atribución), `docs/05-features/genres.md` y `explore.md`.
- **i18n**: `messages/{es,en}/catalog.json`, `errors.json`.
- **Dependencias**: ninguna nueva.
- **Rendimiento**: los conteos recorren la CTE recursiva sobre `release_group_effective_genre`; el diseño fija un presupuesto medido y una salida de caché si no se cumple.

## Goals

- Que la página responda, en este orden: qué es el género, qué escuchar primero y qué hace la comunidad con él.
- Que cada sección sea honesta con pocos datos: se omite en vez de mostrar un hueco o una cifra engañosa.
- Que la exploración dentro de un género (filtrar, ordenar, buscar) sea tan capaz como la de la discografía de un artista.
- Que quien tiene sesión pueda relacionarse con el género (ver su huella, declararlo) sin salir de la página.

## Non-Goals

- **Canciones**: sin riel ni pestaña de canciones (Fase 3). Resolver qué álbum aporta el género a cada canción queda para otro cambio.
- No hay página de familia propia: la familia sigue siendo un corte de Explorar.
- No se modifican la taxonomía, las semillas ni los votos de género, ni el cálculo de géneros efectivos.
- No hay recomendación algorítmica ni personalización por afinidad: la sección personal solo cuenta lo que la persona ya hizo.
- No se añaden votos sobre artistas ni edición de géneros desde esta página.
- No se cambia Explorar (`/explore`) ni su orden; solo se reutiliza su lógica compartida.
- Sin espejo propio de la foto de artista ni de texto de Wikipedia más allá de lo que guarda `genre_localized_text`.
