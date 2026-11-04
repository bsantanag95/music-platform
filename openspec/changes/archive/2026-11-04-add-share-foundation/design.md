## Context

Primer cambio del bloque A de `docs/05-features/sharing.md` (dirección aprobada el 2026-11-04;
decisiones D1, D3, D6 y D13 confirmadas en detalle el mismo día). Estado de partida:

- Las páginas de catálogo ya tienen `generateMetadata`, pero solo con `title`. El layout raíz declara
  título, descripción y `alternates.languages`; no hay `metadataBase`, `openGraph` ni `twitter`.
- No hay botón ni hoja de compartir, ni registro de nada compartido.
- Next 15.5.22 trae `next/og` (`ImageResponse`, Satori + resvg). Verificado en el bundle instalado: los
  formatos de imagen aceptados son PNG, APNG, JPEG, GIF y SVG — **no WebP**. El espejo de carátulas
  (ADR 0018) guarda WebP ≤250 px, y los avatares y fotos de artista también pueden venir en WebP.
- `sharp` ya es dependencia (lo usa el espejo).
- Tipografías de la app: Space Grotesk, Source Serif 4 e IBM Plex Mono, cargadas con
  `next/font/google`, que no expone los bytes; Satori necesita TTF/OTF/WOFF (no woff2) y no admite
  fuentes variables.
- El logo es un monograma "♪" provisional (`src/components/layout/Logo.tsx`) y el nombre sale de
  `common.appName` (`music-platform`, provisional).
- Los avatares existen (`avatar-upload`, migración 0045) y la identidad por monograma está en
  `src/components/social/monogram.ts`. El documento `sharing.md` decía lo contrario: se corrige.
- Hay un limitador por IP en memoria (`src/services/auth/rate-limit.ts`: `consumeAuthAttempt`,
  `getAuthClientIp`) con el mismo supuesto de proceso único que la cola de MusicBrainz.
- Las fotos de artista vienen de Commons con licencia verificada y crédito obligatorio (ADR 0021,
  `chk_artist_photo_credit`).

## Goals / Non-Goals

**Goals:**
- Un renderizador único y un marco común sobre los que los cambios siguientes solo agregan cuerpos y
  formatos.
- Imagen Enlace + metadatos completos en catálogo y perfil, con las reglas de visibilidad del anónimo.
- Hoja de compartir reutilizable en toda la app.
- Medición propia sin datos personales.

**Non-Goals:**
- Historia, Publicación y Cuadrado; compartir archivos con `navigator.share({ files })`.
- Acciones del usuario y páginas de relación (cambio `add-share-user-actions`).
- Analítica de visitas.

## Decisions

### 1. Renderizado en el servidor con `next/og`, runtime Node

`ImageResponse` en un route handler con `export const runtime = "nodejs"`.

- **Por qué:** viene con Next (sin dependencia nueva); escribe la imagen como JSX, de modo que el marco
  y los componentes son código compartido entre formatos; los crawlers necesitan la imagen sin
  navegador. Node (no edge) porque hacen falta `sharp`, `fs` para las fuentes y los servicios de
  base de datos.
- **Alternativas:** canvas/`html-to-image` en el cliente (dependencia nueva, depende del CORS de las
  carátulas, inútil para crawlers); Puppeteer/Playwright de captura (pesado, proceso de navegador en
  el servidor); `@vercel/og` como paquete aparte (es lo mismo que `next/og`).

### 2. Un route handler de imágenes en vez de `opengraph-image.tsx` por ruta

`GET /api/share/image/[kind]/[ref]?locale=es&format=link&v=<versión>[&download=1]`, y cada
`generateMetadata` anuncia esa URL en `openGraph.images` / `twitter.images`.

- **Por qué:** la convención de archivos de Next versiona la URL por el contenido del archivo, no por los
  datos, así que no permite caché inmutable por contenido; además habría que repetir el archivo en cada
  segmento (y en las pestañas) y no serviría para la descarga ni para los formatos siguientes. Un único
  handler: una sola puerta para la visibilidad, el límite de tasa, la caché y los formatos futuros
  (`story`, `post`, `square` se agregan como valores de `format`).
- **Alternativa:** `opengraph-image.tsx` + `twitter-image.tsx` por ruta. Descartada por lo anterior.
- El handler está fuera de `[locale]`, por eso el idioma viaja como parámetro (validado: `es` | `en`).
- Se envuelve con `with-error-handling`; los errores de validación (`kind`, `format`, `locale`
  desconocidos) devuelven `VALIDATION_ERROR`, pero un objeto inexistente u oculto devuelve **200 con la
  imagen genérica** (los crawlers no reintentan ni muestran nada útil ante un 404).

### 3. Un "objetivo de compartir" por tipo, compartido entre metadatos e imagen

`src/services/share/targets/<kind>.ts` exporta `loadShareTarget(ref, locale)` →
`ShareTarget | null`, con todo lo que la imagen y los metadatos necesitan (textos ya localizados,
referencias de carátulas/fotos, cifras con umbral, URL canónica, nombre de archivo de descarga) y
calculado **siempre como visitante anónimo** (las funciones de visibilidad existentes se llaman con
`viewer = null`). La versión es `sha256(JSON.stringify(target))` recortado a 12 caracteres.

- **Por qué:** metadatos e imagen calculan la misma versión con el mismo dato; si divergieran, la URL
  anunciada nunca coincidiría con la imagen servida. Pasar siempre por el anónimo hace imposible
  filtrar datos privados aunque quien cargue la página sea el dueño.
- Se reutilizan los read-models existentes (`loadAlbumDetail`, ficha de artista, `getProfileView`,
  colecciones, premios) envueltos en `cache()` de React para no duplicar consultas dentro del mismo
  request de la página.
- Tipos y referencias: `album`, `song`, `artist` (id interno), `genre` (slug), `awards` (índice, ref
  `-`), `award` (slug), `ceremony` (`<slug>:<año>`), `halls` (índice), `hall` (slug), `hall_class`
  (`<slug>:<año>`), `collections` (índice), `collection` (id), `profile` (id del usuario). La misma lista
  cerrada sirve para `share_event`.
- `buildShareMetadata(target, locale)` arma `openGraph`/`twitter`/`alternates.canonical` y cada
  `generateMetadata` existente lo mezcla con su `title`. En las pestañas (créditos, ediciones, reseñas,
  integrantes, …) el `openGraph` se hereda del layout del objeto.

### 4. Carátulas y fotos: obtener, convertir, nunca ampliar

`src/services/share/images.ts`:
- Carátula: la URL que ya resuelve el pipeline (`cover_thumb_url` del espejo o `front-250` de CAA) — no
  se arma ninguna URL a mano. Se descarga con timeout de 3 s, se pasa por `sharp` a PNG **sin ampliar**
  (`resize({ width: 250, height: 250, fit: "inside", withoutEnlargement: true })`) y se embebe como data
  URI. El retiro a pedido deja `cover_thumb_url` en nulo, así que una carátula retirada nunca se pide. Solo se
  aceptan fuentes de una lista de hosts (CAA, archive.org, Commons, el dominio del storage) o `/uploads/` del
  driver local, para que la ruta no pueda pedir URL arbitrarias.
- Foto de artista (≤500 px en origen) y avatar: misma conversión, acotadas al tamaño de dibujo.
- Cualquier fallo → recuadro tipográfico; la imagen se genera igual.
- Hasta 4 descargas en paralelo por imagen.

### 5. Fuentes versionadas en el repo

`assets/fonts/` con los TTF estáticos de los pesos que usa la app (Space Grotesk 500/700, IBM Plex Mono
400/500, Source Serif 4 400/italic) y los `OFL.txt`. Se leen con `fs.readFile` una vez por proceso
(promesa memorizada). `next.config.mjs` declara `outputFileTracingIncludes` para que el handler los
incluya en el build de producción.

- **Alternativas:** pedirlas a Google Fonts en tiempo de ejecución (red en cada arranque, falla offline);
  usar la Noto Sans incluida en `next/og` (no es la marca).
- Los archivos se descargan de los repositorios oficiales de cada familia (Google Fonts / IBM) al
  implementar, con permiso del usuario.

### 6. Escala de la casa y tokens como datos

`src/lib/share/score-scale.ts` (puro, usable también en el cliente en el bloque B): tramos, color de
fondo y de texto por tramo y la regla "solo estrellas → tramo por estrellas, sin número". Satori no lee
variables CSS, así que los colores de marca viven en `src/lib/share/brand-tokens.ts` como hex; una
prueba compara esos valores con los de `src/app/globals.css` para que no deriven. El contraste ≥4.5:1
de cada tramo se verifica en una prueba unitaria.

Propuesta inicial de tramos (se ajusta en la implementación con la prueba de contraste):
91–100 `#e8b84b` (amber) texto ink · 81–90 `#b8955a` · 71–80 `#8a7f6c` · 61–70 `#4a7c7c` (petrol) ·
41–60 `#35585a` · 1–40 `#8f4a42` (danger atenuado); texto paper donde el fondo es oscuro.

### 7. Marco y componentes

`src/services/share/frame/`: `LaminaFrame` (marco), `BrandSignature` (monograma + `appName` + dominio;
el glifo del monograma se extrae a una constante compartida con `Logo.tsx`), `CoverTile` (carátula o
recuadro tipográfico), `ScoreChip`, `ScaleLegend`, `CreditsLine`, `IdentityBadge` (avatar o monograma
con `monogramStyle`). Los cuerpos por tipo viven en `src/services/share/bodies/`. Son componentes JSX
para Satori (subconjunto de flexbox, estilos en línea), no componentes de la app.

`ScoreChip` y `ScaleLegend` no se usan en ninguna imagen de este cambio salvo la media del álbum; se
construyen y prueban ahora para que el bloque B los herede listos.

### 8. Caché

- Con `v` igual a la versión actual: `Cache-Control: public, max-age=31536000, immutable`.
- Sin `v` o con `v` distinta: se genera con los datos actuales y `Cache-Control: public, max-age=300`.
- `download=1` agrega `Content-Disposition: attachment; filename="<slug>.png"`.
- Si alguna imagen con URL no se pudo obtener, la respuesta lleva la caché corta aunque la versión coincida (la
  versión depende de los datos, no de que CAA haya respondido; sin esto el CDN congelaría el recuadro un año).
- Las imágenes convertidas se recuerdan 1 hora en memoria (300 entradas) y los fallos 5 minutos: CAA tarda
  1,8–2,7 s por miniatura medido desde acá, y una imagen de género junta hasta 4. Timeout de 5 s por fuente.
- No hay caché de imágenes en la base ni en el storage: el CDN es la caché. Si la generación resulta
  cara en producción, guardar el PNG en el storage por clave versionada es una extensión directa.

### 9. Límite de tasa

Se reutiliza el limitador de `auth/rate-limit.ts` (`consumeAuthAttempt` + `getAuthClientIp`) con claves
por espacio de nombres (`share-image:ip:…`, `share-event:ip:…`), como ya hacen la subida de avatar y la
exportación de datos; moverlo de carpeta tocaría once llamadas sin cambiar el comportamiento. Imágenes: 60 por minuto
por IP. Eventos: 30 por minuto por IP. La IP solo vive en memoria del limitador.

### 10. `share_event`

Migración `0079_share_event.sql`:

```sql
CREATE TABLE share_event (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_kind text NOT NULL CHECK (target_kind IN ('album','song','artist','genre','awards','award',
                'ceremony','halls','hall','hall_class','collections','collection','profile')),
  target_ref  text NOT NULL CHECK (char_length(target_ref) BETWEEN 1 AND 200),
  channel     text NOT NULL CHECK (channel IN ('native','copy','x','whatsapp','threads','bluesky',
                'facebook','telegram','reddit','download')),
  format      text NOT NULL CHECK (format IN ('link')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_share_event_created ON share_event (created_at);
CREATE INDEX idx_share_event_target ON share_event (target_kind, target_ref);
```

- Sin FK: las referencias son heterogéneas (ids y slugs) y un evento histórico no debe impedir borrar
  un objeto. Lo único con dato de persona es la referencia de un perfil (id de usuario): la eliminación
  de cuenta (`src/services/auth/account-lifecycle.ts`) borra esos eventos en la misma transacción.
- Sin `updated_at` (filas inmutables), sin usuario, IP ni agente.
- Ampliar `format` en los cambios siguientes es un `ALTER … CHECK` en una migración nueva.
- No entra en la exportación de datos personales: no contiene datos de quien comparte.

`POST /api/share/events` valida con Zod, aplica el límite y responde `204`. El cliente lo llama con
`apiFetch` + `keepalive: true` sin esperar la respuesta (los atajos abren otra pestaña y la descarga no
navega, pero `keepalive` cubre el caso del menú nativo en móviles).

### 11. Hoja de compartir

`src/components/share/ShareButton.tsx` (cliente) + `ShareSheet.tsx` sobre el `Dialog` existente
(`src/components/ui/Dialog.tsx`), que ya resuelve foco atrapado, Escape y retorno del foco; en
pantallas angostas se presenta como hoja inferior. Recibe del servidor `{ kind, ref, url, title,
imageUrl, imageAlt, downloadName }` ya resueltos — el cliente no calcula visibilidad ni versiones.
Las URL de publicación por canal viven en `src/lib/share/channels.ts` (puro, probado):

| Canal | URL |
|---|---|
| X | `https://x.com/intent/post?text=<t>&url=<u>` |
| WhatsApp | `https://wa.me/?text=<t>%20<u>` |
| Threads | `https://www.threads.net/intent/post?text=<t>%20<u>` |
| Bluesky | `https://bsky.app/intent/compose?text=<t>%20<u>` |
| Facebook | `https://www.facebook.com/sharer/sharer.php?u=<u>` |
| Telegram | `https://t.me/share/url?url=<u>&text=<t>` |
| Reddit | `https://www.reddit.com/submit?url=<u>&title=<t>` |

Se abren con `target="_blank" rel="noopener noreferrer"`. La vista previa usa la misma URL versionada de
la imagen (ya cacheada por el CDN tras el primer crawler).

### 12. `via` y URL canónica

`og:url` y `alternates.canonical` se construyen con los helpers de enlaces de catálogo (`catalog-links`)
y nunca incluyen query. Las redirecciones canónicas ya conservan el query, así que `?via=` sobrevive a
un slug desactualizado. Ninguna página lee `via` en este cambio.

## Risks / Trade-offs

- [Satori no soporta todo CSS (grid, algunas propiedades de texto)] → el marco se diseña solo con
  flexbox y se cubre con pruebas de render (snapshot de dimensiones y de que no lanza) por tipo.
- [Generación lenta en frío (fuentes + 4 carátulas)] → fuentes memorizadas por proceso, descargas en
  paralelo con timeout, caché inmutable en el CDN; se mide en la implementación con el presupuesto de
  `sharing.md` (Enlace < 300 ms en caliente).
- [Carátulas de 250 px se ven chicas en 1200×630] → el diseño las dibuja a ≤250 px a propósito
  (licencia) y compensa con tipografía grande; es la restricción aceptada en D6 y el ADR 0049.
- [Mosaicos como ampliación de la política de carátulas] → ADR 0049 + requisito modificado de
  `cover-art-mirror`: máximo 4 por imagen, sin exponer URL, retiros respetados.
- [El limitador en memoria no escala a varias instancias] → mismo supuesto ya documentado para la cola de
  MusicBrainz y el login; se revisa junto con ellos al pasar a varias instancias.
- [Eventos inflables por un cliente malicioso] → límite por IP y listas cerradas; la métrica es
  orientativa, no un contador público.
- [Crawlers que cachean la primera imagen para siempre (WhatsApp, Facebook)] → la URL versionada hace que
  un cambio de datos produzca una URL nueva; el texto viejo en conversaciones viejas es inevitable.
- [`NEXT_PUBLIC_APP_URL` mal configurada en producción] → imágenes con dominio equivocado; se documenta
  como variable obligatoria en el checklist de despliegue y se cae a `http://localhost:3000` solo en
  desarrollo.

## Migration Plan

1. Migración `0079_share_event.sql` (aditiva, sin relleno). Rollback: `DROP TABLE share_event`.
2. Desplegar el código: los metadatos nuevos no rompen nada si el handler falla (los crawlers solo
   pierden la vista previa).
3. Verificar en producción con los validadores de vista previa de X y Facebook y pegando enlaces en
   WhatsApp y Telegram.

## Open Questions

- Pesos exactos de las fuentes: se confirman contra los que usa la app al vendorizarlas.
- Colores finales de los tramos: los fija la prueba de contraste y una revisión visual de la lámina de
  prueba antes de cerrar el cambio.
