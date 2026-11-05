## Why

La búsqueda avanzada solo ofrece campos que MusicBrainz también sabe filtrar, y eso deja dos huecos que aparecen en
cuanto se usa:

- **Nacimiento no es actividad.** En Artistas, "Año de inicio" es el nacimiento de una persona o la formación de un
  grupo (lo único que indexa MusicBrainz). Para un grupo casi da igual (mediana de 1 año entre formación y primer
  álbum en el catálogo), pero para una persona no (mediana de 26 años): "Persona, Chile, 1980–1990" devuelve a Javiera
  Mena (nacida en 1983, primer álbum en 2006), y quien busca músicos de los 80 piensa en su actividad.
- **"Persona" es cualquier humano con ficha.** Integrantes, productores y músicos de sesión también son personas en
  MusicBrainz: de las 800 personas con nacimiento del catálogo, 161 (20 %) son integrantes sin discografía propia. Hoy no
  se puede pedir "solo artistas con discos propios", ni al revés, buscar al productor o al guitarrista de una banda.

Además quedan pendientes los campos que solo conoce el catálogo, como el género de la taxonomía propia, los premios y
el país del artista en Álbumes. Los dos huecos anteriores se resuelven igual: con datos propios que MusicBrainz no
indexa.

## What Changes

- Un **modo solo catálogo**: si la búsqueda usa un campo que MusicBrainz no sabe filtrar, se resuelve solo con la base
  propia, sin solicitudes a MusicBrainz, con orden estable, cifra total y "Cargar más" paginado en SQL, y la página lo
  avisa ("Solo artistas del catálogo"), porque deja fuera lo que el catálogo aún no tiene.
- **Artistas:**
  - "Año de inicio" pasa a llamarse según el tipo ("Año de nacimiento" con Persona, "Año de formación" con Grupo,
    "Año de nacimiento o formación" sin tipo); mismo parámetro y mismo criterio que hoy.
  - Nuevo **Activo entre** (`activeFrom`, `activeTo`), solo catálogo: el período del primer al último disco propio de
    un artista con la discografía explorada, extendido hasta hoy si sigue en actividad.
  - Nuevo **Rol** (`role`), solo con Persona y solo catálogo: con discografía propia, integrante de una banda,
    productor o técnico, o músico (instrumentos o voz) en discos de otros.
  - Nuevo **Género** (`genre`) y **Premios** (`award`, `awardWon`), solo catálogo.
  - Las personas que son integrantes de una banda llevan una etiqueta "Integrante de <banda>" en los resultados (en
    cualquier modo), para reconocerlas aunque se busque sin rol.
- **Álbumes:** nuevos **Género** (`genre`, con sus subgéneros), **País del artista** (`artistCountry`, uno o varios) y
  **Premios** (`award`, `awardWon`), los tres solo catálogo.
- El formulario agrupa los campos nuevos de modo que se vea que solo buscan en el catálogo, y la barra de criterios,
  el estado vacío y los datos destacados los incluyen.
- `GET /api/catalog/search` acepta los parámetros nuevos (sin cambiar la forma de la respuesta).

## Goals

- Poder buscar artistas por su época de actividad y no solo por nacimiento o formación.
- Separar a quienes tienen discografía propia de integrantes, productores y músicos, en las dos direcciones.
- Buscar artistas y álbumes por género de la taxonomía propia, por premios y por país del artista.
- Dejar explícito, en la página y en la URL, cuándo una búsqueda solo ve el catálogo.

## Non-Goals

- **Sello, número de catálogo y formato:** solo ~122 álbumes tienen ediciones sincronizadas (se sincronizan al abrir un
  álbum); buscar por ellos en el catálogo no encontraría casi nada. La vía buena es la búsqueda de *releases* de
  MusicBrainz (que sí indexa `label`, `catno` y `format`), y queda para un cambio propio.
- **Valoración media:** ningún álbum llega hoy a 5 valoraciones (el umbral para mostrar promedios); se retoma cuando
  haya comunidad.
- **Canciones:** los campos del catálogo necesitan las apariciones locales de cada grabación, que solo existen para
  álbumes abiertos; la pestaña Canciones queda como está.
- El mes en los rangos de fechas, y tags o géneros de MusicBrainz (licencia CC BY-NC-SA, ADR 0021/0023).
- Cambiar la forma de la respuesta del endpoint o el modo de búsqueda cuando no hay campos del catálogo.

## Capabilities

### New Capabilities

<!-- Ninguna: los campos amplían la búsqueda avanzada existente. -->

### Modified Capabilities

- `advanced-search-filters`: campos nuevos en Artistas (activo entre, rol, género, premios, etiqueta de nacimiento o
  formación según el tipo) y en Álbumes (género, país del artista, premios); modo solo catálogo con su aviso; excepción
  a "Cada campo con el mismo criterio en las dos fuentes"; grupos del formulario; pestañas que conservan el género y los
  premios; etiqueta "Integrante de".
- `catalog-search`: el endpoint acepta los parámetros nuevos y, con un campo del catálogo, responde sin consultar
  MusicBrainz, con paginación local.

## Impact

- **Código:** `src/services/catalog/search/{filters,params,local-match,artists,albums}.ts`, los resultados de artistas
  (`ArtistResults`, `ResultsTable`), el formulario (`AdvancedSearchForm`, un selector de género reutilizando la
  búsqueda de géneros), `CriteriaChips`, `AdvancedEmpty`, `sections.tsx`, mensajes `messages/{es,en}/catalog.json`.
- **Base de datos:** sin migraciones; consultas sobre `credit`, `membership`, `personnel_credit`,
  `release_group_effective_genre`, `artist_genre_seed`, `genre_relation` y `award_nomination`. Puede hacer falta algún
  índice si una consulta no cumple el presupuesto de tiempo (se decide midiendo).
- **API:** parámetros nuevos de `/api/catalog/search`; `docs/04-api/contracts.md`.
- **Docs:** `docs/05-features/catalog-browsing.md` (búsqueda avanzada), `docs/00-product/roadmap.md`.
