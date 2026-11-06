## Context

Última fase de `add-share-user-actions`. Parte de un renderizador único con formato Enlace, `ShareSheet` y `OwnShareSheet`, y `ShareCard`
como datos comunes. Restricciones:

- Carátulas de 250 px como máximo, sin ampliar (ADR 0018 y 0049): en 1080 de ancho ocupan menos de un cuarto. Decidido: 1080×1920 con
  un vinilo dibujado que llena el ancho.
- Instagram tapa cerca de 250 px arriba y abajo.
- `navigator.share({ files })` necesita el archivo ya descargado y un gesto del usuario reciente.
- Solo el dueño de una valoración o escucha tenía caché corta (ADR 0050). Lo demás de personas seguía inmutable, con el riesgo de que una
  copia en un CDN sobreviva a la moderación.
- `UndoToast` es el único aviso con acción; `ListDetail` ya lo usa.
- Las acciones rápidas de un disco viven en un solo componente, `AlbumQuickActions`.

## Goals / Non-Goals

**Goals:**

- Una imagen vertical con la misma marca para todo lo del bloque A.
- Llegar a Instagram desde el móvil sin descargar a mano.
- Ofrecer compartir sin presionar.

**Non-Goals:**

- Publicación y Cuadrado; editor de la imagen.
- Ofrecer compartir tras valorar o escuchar (principio 4 de `sharing.md`).
- Invalidar copias ya guardadas en un CDN.

## Decisions

### 1. `StoryFrame` junto a `LaminaFrame`, con los mismos datos

El formato cambia el marco, no el `ShareCard`: los objetivos no saben del formato, y la versión de la imagen es la misma. `renderShareImage`
recibe `format` y elige marco y medio.

- **Por qué:** hay más de 20 tipos de objeto. Un parámetro por objetivo multiplicaría el trabajo y dejaría formatos desparejos.
- **Alternativa:** estirar `LaminaFrame` con condicionales: un lienzo vertical cambia el orden del contenido, no solo el tamaño.

Orden, de arriba abajo, dentro de los márgenes seguros de 250 px: medio, kicker, título, subtítulo, meta, cita y firma de quien escribió.
La marca va abajo, en la franja que Instagram tapa solo en parte.

### 2. El medio en vertical

- **Carátula:** 250 px sin ampliar, sobre un vinilo vectorial de unos 900 px centrado.
- **Mosaico:** grilla de 2×2 de hasta 250 px por carátula, sobre el mismo vinilo.
- **Foto de artista y avatar:** hasta 640 px, sin ampliar: la licencia de Commons no limita el tamaño, y `images.ts` ya no agranda.
- **Tipográfico:** el monograma grande.

### 3. Selector y descarga

`SharePayload` suma `storyImageUrl`. La hoja guarda el formato elegido, que cambia vista previa, descarga y evento. Enlace sigue por
defecto: es el que trae vista previa en la mayoría de los canales. Los atajos de redes comparten el enlace en ambos casos.

### 4. Archivo en el menú nativo

Con Historia elegida, la hoja descarga la imagen al seleccionar el formato y guarda el `File`, para que el gesto de "Compartir…" no se pierda
esperando la red. Si `navigator.canShare({ files })` da verdadero, comparte el archivo; si no, el enlace, como hasta ahora.

### 5. Caché corta para lo que no es catálogo

La ruta usa la caché inmutable solo en catálogo: álbum, canción, artista, género, premios, salones y colecciones de Explorar. Lo que es de una
persona lleva siempre la corta. Una lista cerrada `IMMUTABLE_KINDS`, para que un tipo nuevo nazca seguro. Reemplaza el caso especial de
`rating` y `listen`.

- **Costo:** esas imágenes se regeneran cada 5 minutos si se piden, y ya se miden en décimas de segundo.

### 6. `/api/share/payload/[kind]/[ref]`

Devuelve `sharePayloadFor(target)` como anónimo, `404` sin objetivo. Lo usa `LazyShareSheet`, que pide al abrirse. Mismo límite por IP que las
imágenes. Con esto el menú no paga consultas y el enlace sale con su slug y su versión. `commentSharePayload` se queda: ya evita la consulta.

### 7. Ofrecimiento

`UndoToast` ya recibe su etiqueta y su acción, así que no cambia: `ShareOfferToast` lo envuelve con la hoja perezosa, y abrir la hoja reemplaza al aviso para que su expiración no la cierre.

- **Reseña:** al publicarla por primera vez; editarla no ofrece nada.
- **Lista:** al pasar a `public` desde otra audiencia. No se guarda si ya lo fue antes: cada paso a público es un gesto deliberado, y guardarlo
  pediría una columna para un aviso descartable.
- **Camino:** al pasar a completo en su gestión, si es público.

Se descarta solo a los 6 s, sin robar el foco. Nunca bloquea.

### 8. Menús ⋯

`AlbumQuickActions` suma **Compartir** para todos, con y sin sesión. `MyListCardMenu` y `CaminoCardMenu` lo suman solo si lo suyo es público: la
tarjeta ya conoce la audiencia. Las filas de una lista heredan el de `AlbumQuickActions`.

## Risks / Trade-offs

- **[Vinilo vacío en una carátula sin imagen]** → el recuadro tipográfico va en el mismo lugar.
- **[El móvil no comparte archivos]** → cae al enlace; la descarga sigue disponible.
- **[Títulos largos en vertical]** → tamaños por largo, como en `LaminaFrame`; se revisan muestras con títulos largos.
- **[Más generación]** → la caché corta aumenta los pedidos; el límite por IP sigue igual.
- **[Copias ya en un CDN]** → no se limpian: este cambio evita las nuevas.

## Migration Plan

`0082` en scratch durante el cambio. En la BD real va después de `0079` a `0081`.

## Open Questions

Ninguna.
