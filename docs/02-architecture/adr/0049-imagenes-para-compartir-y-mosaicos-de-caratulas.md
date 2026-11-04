# ADR 0049 — Imágenes para compartir y mosaicos de carátulas

## Estado

Aceptado (cambio `add-share-foundation`, 2026-11). Amplía el ADR 0018 (espejo de carátulas) sin reescribirlo: la
política de baja resolución, el retiro a pedido y la atribución siguen iguales; se agrega un uso nuevo de las mismas
miniaturas. Decisiones D3, D6 y D13 de `docs/05-features/sharing.md`.

## Contexto

Compartir es el mecanismo de adquisición del producto (`sharing.md` §1). Un enlace pegado en WhatsApp, X o Telegram
necesita una imagen Open Graph de 1200×630, y las imágenes más compartibles de un catálogo musical son las que
muestran carátulas. Hasta ahora, la regla "sin exposición como colección" del espejo (ADR 0018,
`data-licensing.md` §C) decía que una carátula se sirve solo por su URL exacta, en el contexto de su álbum. Una imagen
de género, de ceremonia o de colección junta varias carátulas en un solo archivo que el usuario puede descargar y
publicar fuera de la app.

Restricciones técnicas: el renderizador de `next/og` (Satori + resvg) no acepta WebP, que es el formato del espejo y
de los avatares; necesita las fuentes como archivos TTF/OTF; y los crawlers piden la imagen sin navegador.

## Decisión

1. **Un solo renderizador en el servidor.** `next/og` en runtime Node, en una única ruta
   `GET /api/share/image/<tipo>/<ref>`. Todas las imágenes comparten el mismo marco, las tipografías de la marca
   (versionadas en `assets/fonts/` con su licencia OFL) y la escala de color de la nota (`src/lib/share/score-scale.ts`).
2. **Se calcula siempre como visitante anónimo.** La imagen y los metadatos salen del mismo "objetivo de compartir",
   cargado con las reglas de visibilidad de un anónimo. Lo que un anónimo no puede ver produce la imagen genérica de
   la marca, nunca una versión recortada.
3. **Caché versionada por contenido.** La URL anunciada lleva `v=<hash de los datos visibles>`; con la versión vigente
   la respuesta es `immutable` y el CDN es la caché. Un cambio de datos produce otra URL. Sin versión o con una vieja,
   se genera con los datos actuales y una caché de 5 minutos.
4. **Mosaicos de carátulas, con límites.** Una imagen para compartir puede componer **hasta 4 miniaturas**, cada una
   a **≤250 px de lado y nunca ampliada**, identificando su disco dentro de un objeto concreto (un género, una
   ceremonia, una clase de salón, una colección), con la **línea de créditos** (Cover Art Archive, MusicBrainz) en la
   imagen. La respuesta no expone las URL ni las claves de las carátulas.
5. **Las carátulas pasan por el pipeline de siempre.** Se usa `cover_thumb_url` (espejo o `front-250`); el retiro a
   pedido lo deja en nulo, así que una carátula retirada no llega a ninguna imagen. Las imágenes se piden solo a una
   lista cerrada de hosts (CAA, archive.org, Commons, el dominio del storage) o a `/uploads/` del driver local, y se
   convierten a PNG con `sharp` antes de componerse.
6. **Fotos de artista solo con crédito.** La foto de Commons se dibuja solo si la ficha tiene autor y licencia, y el
   crédito va en la línea de créditos de la imagen.
7. **Medición sin datos personales.** `share_event` guarda qué se compartió, por qué canal y en qué formato; nunca
   quién comparte ni quién visita (D13).

## Alternativas descartadas

- **`opengraph-image.tsx` por ruta (convención de Next):** versiona la URL por el contenido del archivo, no por los
  datos, así que no permite caché inmutable; habría que repetirlo en cada segmento y no sirve para la descarga ni
  para los formatos siguientes.
- **Renderizar en el cliente (canvas, `html-to-image`):** dependencia nueva, depende del CORS de las carátulas y no
  sirve para los crawlers.
- **Imágenes sin carátulas (solo tipografía):** la opción más conservadora, pero la que menos se comparte; contradice
  el objetivo del feature.
- **Una sola carátula por imagen:** deja sin imagen útil a los géneros, ceremonias y colecciones, que no tienen una
  carátula propia.
- **Cachear los PNG en el storage:** innecesario mientras el CDN cachee la URL versionada; queda como extensión si la
  generación resulta cara en producción.

## Consecuencias

- La regla "sin exposición como colección" del espejo admite una excepción acotada (spec `cover-art-mirror`). Ninguna
  ruta lista carátulas ni permite descargarlas en bloque.
- Las carátulas se ven chicas en una imagen de 1200×630: es el costo aceptado de la política de baja resolución, y el
  diseño lo compensa con tipografía grande en vez de estirarlas.
- `NEXT_PUBLIC_APP_URL` pasa a ser obligatoria en cualquier despliegue: sin ella `og:image` apunta a `localhost`.
- El límite de generación por IP vive en memoria, con el mismo supuesto de proceso único que la cola de MusicBrainz.
- Las fuentes de la marca solo cubren el subconjunto latin, igual que la app. Para un glifo fuera de esa cobertura
  (un nombre en cirílico o en japonés, un emoji), `next/og` pide en el momento una fuente de respaldo a Google Fonts
  con esos caracteres; es texto público del catálogo y no lleva datos de nadie, pero es una salida a un tercero. Sin
  red, esos glifos no se dibujan y el resto de la imagen sale igual. Si se quiere evitar, el paso es versionar
  también una familia Noto para esas escrituras.
- Los gates de monetización de `data-licensing.md` siguen vigentes: si el proyecto monetiza, esta decisión se revisa
  junto con la política de carátulas.
