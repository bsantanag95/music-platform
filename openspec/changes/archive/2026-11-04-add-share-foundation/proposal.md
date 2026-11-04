## Why

Hoy un enlace de la app pegado en WhatsApp, X o Telegram sale sin carátula ni descripción útil, y no
existe ningún gesto de "Compartir": la función que el producto necesita para crecer y para que el
gusto de cada persona salga de la app no tiene base. Este es el primer cambio del bloque A de
[`docs/05-features/sharing.md`](../../../docs/05-features/sharing.md): construye la pieza común
(renderizador de imágenes, marco visual de las Láminas, hoja de compartir y medición) sobre la que
se apoyan todos los cambios siguientes, y la estrena en las páginas de catálogo y en el perfil.

## What Changes

- **Renderizador de imágenes sociales** en el servidor con `next/og` (runtime Node, sin dependencias
  nuevas): fuentes de la marca versionadas en el repo como TTF/OTF estáticos, carátulas y fotos
  convertidas a PNG con `sharp` (el motor no acepta WebP), caché versionada por contenido.
- **Marco común de las Láminas** (nombre adoptado, D1; en inglés *Cards*): cabecera, cuerpo, leyenda y
  firma con la misma rejilla en todo formato; **escala de la casa** para la nota 1–100 (el dorado solo
  en 91–100); **firma de marca** definida en un solo lugar (nombre de la app desde los mensajes + el
  monograma actual); **línea de créditos** cuando hay carátulas, datos de MusicBrainz o una foto de
  Commons.
- **Imagen del enlace** (Open Graph y Twitter/X, 1200×630; D3) y metadatos completos (`metadataBase`,
  título, descripción, imagen, `alt`, idioma) para: álbum, artista, canción, género, premios (índice,
  premio, ceremonia), salones de la fama (índice, salón, clase), colecciones de Explorar y perfil.
  Cuando un anónimo no puede ver el contenido, la imagen es la **genérica** de la marca.
- **Mosaicos de carátulas** (D6): las imágenes de género, ceremonia, clase de salón y colección juntan
  hasta 4 miniaturas de 250 px sin ampliarlas, con créditos, respetando retiros. Se registra en un
  **ADR nuevo (0049)** y en `data-licensing.md`.
- **Hoja de Compartir** (`ShareSheet`) y botón Compartir en la cabecera de esas mismas páginas: menú
  nativo (`navigator.share`), copiar enlace, atajos por *intent URL* a X, WhatsApp, Threads, Bluesky,
  Facebook, Telegram y Reddit, y descargar la imagen. Sin SDK ni scripts de terceros.
- **Medición propia** (D13): tabla `share_event` (qué objeto, qué canal, qué formato, cuándo; sin datos
  de quien comparte ni de quien visita) alimentada por la hoja, y parámetro `?via=<canal>` en los
  enlaces compartidos.
- Documentación: `sharing.md` (D1, D3, D6 y D13 confirmadas; corrección: los avatares sí existen),
  `04-api/contracts.md`, `03-data/sql-model.md`, `business-rules.md` (visibilidad de lo compartido),
  `data-licensing.md` y ADR 0049.

## Goals

- Que cualquier enlace a una página de catálogo o a un perfil se vea, al pegarlo, como una pieza de
  la marca.
- Dejar listo y probado el marco visual común para que la Historia, las acciones del usuario y las
  Láminas del bloque B solo agreguen "cuerpos" nuevos.
- Que compartir sea el mismo gesto en toda la app y nunca exponga más de lo que un anónimo ve.
- Saber qué se comparte y por qué canal, sin rastrear personas.

## Non-Goals

- Formatos Historia, Publicación y Cuadrado (llegan con `add-share-user-actions` y el bloque B).
- Compartir acciones del usuario (valoración, escucha, reseña, comentario, lista, progreso) y las
  páginas de relación persona ↔ disco.
- Compartir la imagen como archivo con `navigator.share({ files })` (va con la Historia).
- Ofrecimientos de compartir tras una acción (toasts en momentos con significado).
- Analítica de visitas: el `?via=` queda en los enlaces, pero no se registra quién llega.
- Cambiar el logo o el nombre del producto.

## Capabilities

### New Capabilities

- `share-images`: renderizado de imágenes sociales — marco común de las Láminas, escala de la casa,
  firma, fuentes, carátulas y fotos en la imagen (baja resolución, conversión, créditos, retiros),
  formato Enlace, imagen genérica, caché versionada, límites de tasa.
- `share-metadata`: metadatos Open Graph y Twitter/X de cada página de destino (catálogo y perfil),
  con la URL absoluta, el idioma de la ruta, el texto alternativo y las reglas de visibilidad del
  visitante anónimo.
- `share-sheet`: botón y hoja de Compartir — acciones, atajos por canal, `?via=`, descarga de la
  imagen, comportamiento sin `navigator.share` y accesibilidad.
- `share-events`: registro de cada uso de la hoja en `share_event` y su endpoint, sin datos
  personales.

### Modified Capabilities

- `cover-art-mirror`: el requisito "Sin exposición de las carátulas como colección" pasa a admitir
  imágenes compuestas para compartir (hasta 4 miniaturas de 250 px por imagen, cada una identificando
  su disco dentro de un objeto concreto), sin abrir ningún listado ni descarga en bloque.

## Impact

- **Código nuevo:** `src/services/share/` (datos por objeto, versión, escala, marco, fuentes, imágenes),
  `src/components/share/` (`ShareButton`, `ShareSheet`), route handler de imágenes en
  `src/app/api/share/image/…` y de eventos en `src/app/api/share/events`, fuentes en el repo.
- **Código tocado:** `generateMetadata` de las páginas de catálogo y del perfil, layout raíz
  (`metadataBase`), cabeceras de esas páginas (botón Compartir), mensajes `es`/`en`,
  `client-messages.json`.
- **Base de datos:** migración `0079_share_event.sql` + espejo en `src/db/schema.ts`.
- **APIs:** `GET /api/share/image/<kind>/<ref>` y `POST /api/share/events` (contrato nuevo).
- **Dependencias:** ninguna nueva (`next/og` viene con Next 15; `sharp` ya está).
- **Configuración:** `NEXT_PUBLIC_APP_URL` pasa a ser necesaria para las URL absolutas de las imágenes.
