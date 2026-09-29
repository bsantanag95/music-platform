## Context

`ArtistDiscography` (cliente) recibe las secciones, la sección activa, "Mejor valorado" y las
marcas del usuario (`getDiscographyMarks`: discos escuchados y estrellas propias, dos consultas en
lote). La grilla muestra carátula, título, año, "EP" y un ✓ o las estrellas; la tabla muestra
año, miniatura, título, tipo (chip), comunidad ("★ media (n)" o "< 5 notas") y "Tú".

El panel "Tu relación" del álbum ya resuelve cada acción con APIs existentes:
`createListenEntry`, `toggleFavorite`, `toggleWantToListen`, `saveRating` (conservando el puntaje
detallado solo si sigue siendo coherente con las estrellas, `isScoreCoherent`) y
`AlbumListPicker` (necesita las pertenencias a listas propias del disco). Registrar una escucha
retira el objetivo de Pendiente (spec `want-to-listen`).

## Goals / Non-Goals

**Goals:**

- Cualquier acción personal sobre un disco sin salir de la discografía.
- Ver de un vistazo qué hiciste con cada disco.
- Una tabla más limpia y sin términos ambiguos.

**Non-Goals:**

- Reseñas y colección física desde el menú (siguen en el álbum).
- Orden por columnas en la tabla, y el placeholder de carátulas que no cargan (para después).
- El mismo menú en otras superficies (búsqueda, listas, perfil).
- Cambios en los paneles del álbum o de la canción.

## Decisions

### D1. Un popover de diálogo, no un `role="menu"`

El contenido mezcla botones, conmutadores, estrellas, casillas de listas y el formulario de
detalles de la escucha: la semántica de `menu` (solo `menuitem`, navegación con flechas) no lo
admite. El botón "…" abre un **popover no modal** con `role="dialog"` y nombre accesible
("Acciones de {disco}"); el botón lleva `aria-haspopup="dialog"` y `aria-expanded`. El foco entra
al primer control, el orden de tabulación es el natural, Escape y el clic afuera cierran y el foco
vuelve al botón.

- **Un solo abierto**: el id del disco abierto vive en `ArtistDiscography`; abrir otro cierra el
  anterior.
- **Posición**: en pantallas `sm` o más, anclado bajo el botón y alineado a su borde derecho,
  dentro del ancho de la página; en móvil, una hoja inferior fija a lo ancho (un popover de 16rem
  desde una tarjeta de la primera columna se saldría de la pantalla).
- **Botón en la grilla**: esquina superior derecha de la carátula, visible al pasar el mouse o
  con el foco dentro de la tarjeta, siempre visible en dispositivos sin hover
  (`@media (hover: none)`) y mientras su popover está abierto. En la tabla, siempre visible en la
  última columna.

### D2. Acciones y su estado

Mismo comportamiento que el panel del álbum, con actualización al confirmar el servidor (no
optimista), un control deshabilitado mientras su acción está en vuelo y un mensaje de error en el
popover si falla:

- **Registrar escucha**: un clic. Después, "Escucha registrada · Agregar detalles"; "Agregar
  detalles" despliega `ListenEntryForm` dentro del popover. El disco pasa a escuchado y sale de
  Pendiente.
- **Favorito** y **Pendiente**: conmutadores con `aria-pressed`.
- **Agregar a lista…**: despliega `AlbumListPicker` con las pertenencias del disco.
- **Calificar**: `StarRatingInput` en línea; guardar conserva el puntaje detallado solo si sigue
  siendo coherente, y si lo descarta lo avisa (mismo criterio y mensaje que el panel del álbum,
  que tampoco ofrece quitar la nota).
- **Ir al álbum**: enlace.

Sin sesión, el popover muestra "Iniciá sesión para registrar escuchas, calificar o armar listas",
el enlace a iniciar sesión e "Ir al álbum".

### D3. Marcas precargadas en lote

`getDiscographyMarks` suma, en consultas por lote sobre los ids de la discografía: favoritos,
Pendiente, puntaje detallado junto a las estrellas y pertenencias a listas propias (id de lista,
id del ítem, tipo y título, la forma de `PickerMembership`). Así el popover no necesita una request
al abrirse ni un endpoint nuevo. Las marcas viven en estado de `ArtistDiscography` y el popover las
actualiza.

### D4. Tus marcas a la vista

- **Grilla**: etiqueta en la esquina inferior de la carátula, con el mismo fondo que las
  etiquetas "EP" y "Mejor valorado" (sin degradés nuevos), con tu
  nota ("★ 4½") o ✓ si solo escuchaste, ♥ si es favorito y el marcador si está en Pendiente. Sin
  marcas, no hay franja. Cada ícono con texto accesible.
- **Tabla**: la columna "Tú" con el mismo contenido y el mismo orden.
- Los íconos son los del panel (`HeartIcon`, marcador); nada de glifos sueltos.

### D5. Media y tipo

- La columna "Comunidad" pasa a llamarse **"Media"**: "★ 4,2 (12)" con al menos 5 valoraciones y
  "—" atenuado en otro caso, con el texto accesible "menos de 5 valoraciones". Desaparece
  "< 5 notas".
- El chip de tipo va junto al título y **solo cuando algún tipo no es "álbum"** (EP, en vivo,
  banda sonora, remix…). La columna Tipo desaparece. En móvil, la segunda línea bajo el título
  lleva el chip (si corresponde) y la media.

## Risks / Trade-offs

- **Popover con formularios**: más pesado que un menú simple → solo se monta el popover abierto,
  y el formulario de detalles y el selector de listas se despliegan a pedido.
- **Marcas de discografías grandes** (cientos de discos): las consultas por lote siguen siendo
  una por tabla; las pertenencias a listas se limitan a las listas del propio usuario.
- **Hover en la grilla**: el botón oculto hasta el hover podría no descubrirse → siempre visible
  en táctiles y con el foco de teclado.
