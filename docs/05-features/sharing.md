# Compartir

**Estado:** 🟢 Dirección aprobada (2026-11-04). Bloque A implementado: `add-share-foundation` y las tres fases de
`add-share-user-actions` (§9). Bloque B en curso: `add-top-n-lamina-phase1` implementado. Documento de dirección: reúne en un
solo lugar todo lo que abarca "Compartir" antes de abrir cualquier cambio de OpenSpec, para que cada
cambio posterior parta del mismo contexto. Las decisiones de la §8 quedaron **adoptadas como punto de
partida**; cada una se revisa en detalle, y se confirma o corrige, en el cambio que la implementa.

**Dos bloques, en este orden:**

- **Bloque A — Compartir lo que haces.** Cada acción relevante (escucha, valoración, reseña, comentario,
  lista, progreso…) se puede llevar a X, Instagram, WhatsApp, etc. con un enlace que se ve bien y una
  imagen lista para publicar.
- **Bloque B — Láminas: tu gusto como gráfico.** Formatos visuales propios para mostrar cómo
  puntuaste una discografía, tus favoritos o tu ranking: gráfica de discografía (tipo SeriesGraph),
  Top 5/10 y tier list, más otros formatos. Es la innovación del feature y se construye al final, sobre
  la base del bloque A.

Nombre de trabajo de la familia visual: **Láminas** (alternativas: *Postales*, *Carteles*, *Afiches*;
§8, D1).

---

## 1. Por qué y desde qué principios

Compartir es el mecanismo de adquisición del producto (cada imagen publicada es un anuncio con la
firma del usuario) y una pieza social: el pilar "capital social del gusto" de
[`product_philosophy.md`](../00-product/product_philosophy.md) §4 necesita salir de la app para existir.
La PRD ya lo nombra como diferencial frente al streaming ("compartir y descubrir lo que otros
escuchan"), y el ADR 0001 eligió PWA en parte por la Web Share API.

Principios que este feature no puede romper:

1. **El enlace es la unidad; la imagen es el anzuelo.** Toda imagen lleva a una página real y pública
   de la app. Una imagen sin destino no trae a nadie (en Instagram la imagen viaja sola: el destino va
   en el sticker de enlace de la historia o en la bio).
2. **Quien llega por un enlace compartido es anónimo.** La página de destino tiene que funcionar sin
   cuenta, mostrar lo compartido completo y ofrecer **"Haz la tuya"** como siguiente paso (§6).
3. **Compartir nunca amplía la audiencia en silencio.** Lo que la página o la imagen muestran respeta la
   audiencia de cada dato (`private`/`followers`/`public`). Si algo es privado, compartirlo exige un
   gesto explícito de hacerlo público (business-rules: "Privacidad"); nunca se publica por el solo hecho
   de generar la imagen.
4. **Sin presión.** Nada de "comparte para desbloquear", rachas ni modales al terminar una acción
   ([`vision.md`](../00-product/vision.md): sin gamificación por volumen). El ofrecimiento de compartir
   aparece en momentos con significado (§3.4) y siempre como acción secundaria descartable.
5. **El desacuerdo es contenido** (principio 5.3). Los formatos deben favorecer la comparación ("tu
   ranking de Metallica no se parece al mío") porque es lo que provoca respuesta y nuevos usuarios.
6. **Una sola marca.** Toda imagen sale del mismo renderizador, con el mismo marco, tipografías, escala
   de color y firma (§5). Ningún formato puede parecer sacado de otro sitio.
7. **El puntaje no se inventa.** Si alguien valoró solo con estrellas, se muestran estrellas; nunca se
   fabrica un número 1–100 para rellenar una celda.

---

## 2. Qué existe hoy

> Este apartado describe el punto de partida (2026-11-04). Desde `add-share-foundation` las páginas de
> catálogo y el perfil tienen imagen del enlace, metadatos Open Graph y botón Compartir (§9).

- Ninguna página define metadatos Open Graph propios con imagen (`openGraph`, `twitter:`) ni genera
  imágenes sociales. Un enlace pegado hoy en WhatsApp o X sale sin carátula ni descripción útil.
- No hay botón ni hoja de "Compartir" en ninguna superficie.
- Páginas públicas que ya sirven de destino: álbum, artista, canción, género, premios, salones de la
  fama, colecciones de Explorar, reseña (`/review/<id>`), perfil (`/users/<u>`), huella
  (`/users/<u>/fingerprint`), diario, favoritos, listas, listas para completar (`/users/<u>/caminos/<id>`),
  colección.
- **Faltan destinos públicos** para: el progreso de discografía (solo existe `/me/artist-journeys`), la
  relación de una persona con un álbum o una canción (valoración + escuchas + reseña) y el enlace directo
  a un comentario.
- Restricciones que condicionan el diseño:
  - **Carátulas solo en baja resolución** (`front-250`, ≤250 px, ADR 0018,
    [`data-licensing.md`](../03-data/data-licensing.md) §C), con retiro a pedido y sin exposición como
    colección. Afecta directamente a imágenes que juntan muchas carátulas (§5.5).
  - **Foto de perfil opcional** (`avatar-upload`, migración 0045): la identidad en la imagen es la foto o,
    sin ella, el monograma determinista, más nombre y `@usuario`. (La primera versión de este documento
    decía que no había avatar; se corrigió en `add-share-foundation`.)
  - Tipografías de la app: Space Grotesk (display), Source Serif 4 (cuerpo), IBM Plex Mono (datos).
  - Escala: estrellas 0.5–5 y "Valoración detallada" 1–100 opcional, coherente con las estrellas.
  - Las escuchas **nacen privadas**.
  - El nombre "music-platform" es provisional: la firma de la imagen no puede quedar escrita a mano en
    cada formato.

---

## 3. Bloque A — Compartir lo que haces

### 3.1 Inventario de acciones compartibles

| Qué | Destino (URL) | Imagen del enlace (OG) | Página hoy | Condición para compartir |
|---|---|---|---|---|
| Álbum, artista, canción | Su página de catálogo | Carátula/foto, título, artista, año; cifras de comunidad solo con umbral (≥5) | ✅ | Siempre (catálogo) |
| Género, premio, ceremonia, salón, colección de Explorar | Su página | Mosaico de carátulas + título | ✅ | Siempre |
| **Valoración** de álbum o canción | Página de **relación** `/users/<u>/album/<id>` (y `/song/<id>`) | Carátula + "@ana" + 86 o 4.5★ | ✅ | Marca "compartida" o destacada (D15): `rating` no tiene audiencia |
| **Escucha** (entrada del diario) | Misma página de relación, con `?escucha=<id>` | Carátula + mes y año + reacción + impresión | ✅ | La escucha nace privada → la hoja ofrece "Hacer pública y compartir" |
| **Reseña** | `/review/<id>` | Carátula + cita (≤200 caracteres) + estrellas (el puntaje detallado solo lo ve su autor) | ✅ | Reseña visible y no oculta por moderación |
| **Comentario** | Página propia `/comment/<id>` (D16) | Cita + objeto comentado | ❌ nueva | Comentario visible; las respuestas llevan a su raíz |
| **Lista** | `/users/<u>/lists/<id>` | Mosaico de 4 carátulas + título + cantidad | ✅ | Lista pública |
| **Lista para completar** (Camino) | `/users/<u>/caminos/<id>` | Mosaico + cantidad de discos (sin progreso: el del dueño sale de sus escuchas, que tienen audiencia propia, y la página solo muestra el de quien mira) | ✅ | Pública |
| **Progreso de discografía** (Recorrido) | Página pública nueva — es la **gráfica de discografía** del bloque B (§4.2) | Barra de progreso + carátulas | ❌ nueva | Progreso público |
| **Perfil** | `/users/<u>` | La Placa / Tarjeta de Identidad | ✅ | Perfil autorizado para anónimos |
| Huella de gusto | `/users/<u>/fingerprint` | Identidad + década y familia más presentes (solo lo que ve un anónimo: sin valoraciones ni colección) | ✅ | Ídem, con favoritos o escuchas públicas |
| Colección física | `/users/<u>/collection` | Mosaico + cantidad por formato, solo de las entradas públicas | ✅ | Alguna entrada pública |
| Afinidad con otra persona | Perfil de la otra persona (vista de afinidad) | "Ana y Leo: 82 % de afinidad" + discos en común | ✅ parcial | Ambos perfiles visibles para anónimos (si no, solo imagen) |

Las páginas de **relación** (`/users/<u>/album/<id>`) son la pieza nueva más importante del bloque: un
solo destino que reúne todo lo de una persona con un disco (valoración, escuchas visibles, reseña,
favorito, en colección), en vez de una página por cada acción. Es el patrón de Letterboxd
(`/usuario/film/<slug>`). Ver §8 D4.

### 3.2 Formatos de imagen

| Formato | Tamaño | Para qué | Bloque |
|---|---|---|---|
| **Enlace** (OG) | 1200×630 | Vista previa automática en X, WhatsApp, Telegram, Discord, Slack, iMessage | A |
| **Historia** | 1080×1920 | Instagram/Facebook/TikTok stories, estados de WhatsApp; respeta zonas seguras (≈250 px arriba y abajo libres) | A y B |
| **Publicación** | 1080×1350 (4:5) | Feed de Instagram, X con imagen | B (y reseñas en A) |
| **Cuadrado** | 1080×1080 | Formatos de grilla (Top 9 clásico), Threads, Bluesky | B |

El bloque A genera **Enlace** (siempre, automático) y **Historia** (a pedido). El bloque B suma
Publicación y Cuadrado.

### 3.3 La hoja de Compartir

Un único componente (`ShareSheet`) para toda la app, para que el gesto sea siempre el mismo:

- **Vista previa** de la imagen en el formato elegido, con selector de formato (Enlace / Historia /
  Publicación / Cuadrado según lo que admita el objeto).
- **Acciones**, en este orden:
  1. **Compartir…** — `navigator.share` nativo (en móvil abre el selector del sistema; con
     `navigator.canShare({ files })` comparte la imagen como archivo, que es la única vía web hacia
     Instagram Stories).
  2. **Copiar enlace.**
  3. Atajos con *intent URL* (no requieren SDK de terceros): X, WhatsApp, Threads, Bluesky, Facebook,
     Telegram, Reddit.
  4. **Descargar imagen** (nombre de archivo legible: `metallica-discografia-ana.png`).
- **Aviso de audiencia** antes de compartir algo no público: "Esta valoración es privada. Para que el
  enlace se vea, hazla pública." con el botón explícito **"Hacer pública y compartir"**. Sin ese gesto,
  solo se puede descargar la imagen, generada para el dueño con su sesión y sin caché pública (decisión §8 D5).
- **Nunca** Facebook SDK, píxeles ni scripts de terceros: los atajos son enlaces planos.

### 3.4 Dónde aparece

- Botón **Compartir** (ícono) en la cabecera de cada página de destino del inventario y en el menú "⋯"
  de cada fila donde ya hay acciones rápidas (discografía, listas, reseñas, comentarios).
- **Momentos con significado** — un enlace "Compartir" dentro del aviso de confirmación (toast), nunca un
  modal:
  - reseña publicada;
  - lista hecha pública (cada vez que pasa a pública: guardar si ya lo fue pediría una columna para un aviso descartable);
  - lista para completar terminada, si es pública. La discografía completada espera a su página pública (`add-discography-lamina`);
  - lámina creada (bloque B).
  Valorar o registrar una escucha **no** ofrece compartir: son gestos frecuentes y el ofrecimiento sería
  ruido (principio 4).
- Contenido ajeno público también se comparte (una reseña de otra persona); la imagen lleva la firma de
  quien escribió, no de quien comparte.

### 3.5 Reglas de visibilidad de la imagen y la página

- La página de destino aplica exactamente las mismas reglas que hoy (perfil privado, bloqueo, cuenta
  desactivada, moderación). Un crawler es un visitante anónimo.
- La imagen OG de un contenido que el anónimo no puede ver es **genérica** (marca + "Contenido no
  disponible"), nunca una versión recortada que filtre datos.
- Contenido oculto por moderación o de una cuenta desactivada: imagen genérica, aunque esté en caché
  (la clave de caché incluye la versión del contenido y su estado; §7.3).
- Cifras de comunidad en la imagen con los mismos umbrales que en la página (media solo con ≥5
  valoraciones, "menos de 5" en conteos).

### 3.6 Idioma

La imagen se genera en el idioma del segmento `[locale]` de la URL (ADR 0007): el enlace `/es/...`
produce imagen en español. Los textos de la imagen salen de los mismos catálogos de `next-intl`.

---

## 4. Bloque B — Láminas: tu gusto como gráfico

Una lámina es una imagen + una página interactiva que muestra una parte de tu gusto. Todas comparten el
sistema visual de la §5. Se dividen en dos clases (decisión de modelo en §8 D7):

- **Derivadas:** se calculan solas desde tus datos (gráfica de discografía, tu año). No se "crean":
  existen en cuanto hay datos y siempre muestran el estado actual.
- **De autor:** las armas tú (Top N, tier list). Tienen título, orden y audiencia propios.

### 4.1 Lámina de discografía (referencia: SeriesGraph) — *derivada*

La traducción directa de SeriesGraph: **columnas = discos** (orden cronológico), **filas = número de
pista**, **celda = tu valoración de esa canción** coloreada con la escala de la casa. Arriba de cada
columna, la carátula y tu nota del disco.

```
            Kill 'Em  Ride the  Master of  …Justice  Metallica
             (1983)    (1984)    (1986)    (1988)    (1991)
  Disco        78        90        97        88        81
  Pista 1      72        88        96        91        85
  Pista 2      80        92        93        84        78
  …
```

- **Qué cuenta como celda:** la valoración de la **canción** (detallada si existe; si no, sus estrellas,
  mostradas como estrellas). Sin valoración → celda vacía con borde, no gris "0". Una pista sin valorar
  no castiga a nadie.
- **Qué discos entran:** por defecto los de estudio de la discografía propia (los mismos tipos que la
  página del artista); interruptores para EP, en vivo y compilados. Discos sin ninguna valoración
  (ni del disco ni de sus pistas) se omiten de la imagen.
- **Quién la ve:** el dueño y sus seguidores, como cualquier valoración. A los demás se la abre una marca por artista, con el gesto
  "Hacer pública y compartir": reversible, y se mantiene al día con las notas nuevas (§8 D19). No abre esas valoraciones en otro lugar.
- **Dos vistas**, porque la mayoría valora discos y no cada pista:
  - **Por canción** (la grilla de arriba). Se ofrece cuando hay suficientes pistas valoradas (umbral a
    definir; §8 D9).
  - **Por disco** — una fila de carátulas con su nota y una curva de la carrera (la nota de cada disco en
    el tiempo). Siempre disponible con ≥3 discos valorados.
- **Límites de imagen:** hasta 20 discos en Publicación e Historia, con "+n" si hay más, y 5 en Enlace (pistas extra de ediciones
  de lujo quedan fuera: se usa la tracklist de la edición representativa).
- **Página:** `/users/<u>/artist/<id>` (§8 D4) — la misma página pública que le faltaba al **progreso de
  discografía**: la barra discreta del recorrido vive en la cabecera de la lámina, sin números (nunca "X de Y" fuera de la
  página de gestión, `product_philosophy.md` §6.4.1); sin recorrido, cuántos discos valoró, sin total. Un destino, dos usos.
- **Carátulas:** hasta 10, las de los mejor valorados; los demás, recuadro tipográfico (ADR 0053).
- **Valora lo que falta y Arma la tuya:** la discografía propia existe siempre, también sin valoraciones, y `?valorar=1` lista lo que falta con sus
  estrellas. En la de otra persona, "Arma la tuya" lleva a la propia de ese artista en ese modo, también después de registrarse (`discografia=<id>`,
  ADR 0054).
- **Qué se muestra lo decide el dueño:** suma En vivo y Recopilatorios (los EP ya están en la principal) y elige la vista por defecto. La imagen
  compartida muestra eso; un visitante puede cambiar de vista en la página. La Lámina de un álbum vive en `?disco=` y la abre la misma marca.
- **Lectura:** celda con tooltip (canción, nota, fecha), clic lleva a la canción. Visitante con cuenta:
  **"Compárala con la tuya"** (§4.4.2).

Variante para un solo disco: **Lámina de álbum** — las pistas de un disco como barras verticales con tu
nota, estilo "ecualizador" (encaja con la metáfora VU de la marca). Sirve para la reseña y para quien
valoró un disco pista por pista.

### 4.2 Top N (referencia: My Top 9) — *de autor*

Un ranking corto, numerado, con carátulas grandes. Formato propio, no la grilla 3×3 genérica:

- **Tamaños:** Top 5 (uno destacado + cuatro) y Top 10 (dos filas de cinco). El 3×3 sin números se
  ofrece como estilo "Grilla" del Cuadrado para quien quiere el clásico (§8 D10).
- **Qué se rankea:** álbumes (principal), canciones (con la carátula de su disco) o artistas (foto de
  Commons cuando existe; si no, monograma tipográfico — nunca una imagen inventada).
- **De dónde salen los ítems** (para que armarlo tome segundos):
  - a mano con el buscador local-first que ya usa "Añadir a lista";
  - **desde tus valoraciones**: "tus 10 mejor valorados" con filtros por año de lanzamiento, año de
    escucha, década, género o artista;
  - desde favoritos o desde una lista existente.
  Una fuente copia los ítems **una vez**: después la Lámina es del autor y no cambia si cambian las valoraciones, los
  favoritos o la lista. Se elige al crear y, en una Lámina existente, completa solo los lugares libres. Lo armado desde una
  fuente **nace "Solo yo"** (§8 D18). El "año de escucha" exige una escucha de ese mismo disco o canción en el diario, en la
  zona horaria de la persona.
- **Mostrar nota:** opcional por lámina (hay quien quiere rankear sin exponer números). Armar desde valoraciones no la enciende.
- **Títulos sugeridos** que empujan rituales: "Mis 10 discos de 2026", "Top 5 de los 90", "Lo mejor de
  Iron Maiden". Encaja con el pilar "rituales anuales con opinión" — el fin de año es el momento de mayor
  viralidad de estos formatos.

### 4.3 Tier list — *de autor*

- **Niveles por defecto alineados con la escala de la casa** (§5.3): S = 91–100, A = 81–90, B = 71–80,
  C = 61–70, D = 41–60, E = 1–40. Etiquetas editables (texto corto), cantidad fija de 6 en la primera
  versión.
- **Se puede prellenar desde tus valoraciones** — es la innovación respecto de las tier lists genéricas:
  eliges "Discografía de Metallica" y los discos caen solos en su nivel según tu nota; los no valorados
  quedan en la bandeja **"Sin escuchar / sin valorar"**. Después se arrastra a gusto.
- **La tier list no escribe valoraciones.** Mover un disco de A a S no cambia tu nota (es una lámina,
  no un formulario de valoración; §8 D8). La página puede mostrar, discreta, la nota real al pasar el
  cursor.
- **Fuentes de ítems:** discografía de un artista, una lista, un género/década, o a mano. Ítems:
  álbumes primero; canciones y artistas después.
- **Editor:** arrastrar y soltar con alternativa de teclado y de toque (mover con "Mover a…" desde el
  menú del ítem) — requisito de accesibilidad, no un extra.

### 4.4 Otras láminas propuestas

Ordenadas por valor estimado / costo. Ninguna entra en la primera ronda; quedan registradas para no
perderlas.

1. **Tu año en discos** (*derivada*) — calendario del año con las carátulas de lo escuchado por mes,
   más tu Top 5 del año y cifras propias (discos nuevos, artistas descubiertos). Es la respuesta al
   Wrapped del principio "Spotify *muestra* tu año; acá lo *construyes*": se publica en diciembre y el
   usuario elige qué entra. Usa el diario con la zona horaria del usuario.
2. **Tú vs. otra persona** (*derivada*) — la misma discografía puntuada por dos personas, lado a lado,
   con las diferencias resaltadas ("donde más discrepan"). El principio 5.3 hecho imagen; además
   **obliga** al otro a tener cuenta y valorar para aparecer, que es el bucle viral más fuerte.
3. **Mis décadas / mi mapa de géneros** (*derivada*) — la huella de gusto como imagen (distribución por
   década y por familia de géneros).
4. **Mes en discos** — versión mensual del #1, liviana, para quien registra escuchas.
5. **Pared de la colección** — la colección física como estantería de lomos/carátulas.
6. **Cita de reseña** — tipografía grande con la frase elegida de una reseña (la reseña ya está en el
   bloque A; esto es su versión "Publicación").

---

## 5. Sistema visual común — que todo se vea de la misma casa

### 5.1 El marco

Toda lámina e imagen del bloque A comparte la misma estructura, en el mismo orden:

```
┌───────────────────────────────────────┐
│ CABECERA  Título de la lámina          │  Space Grotesk
│           Subtítulo (artista · período)│
│           Nombre · @usuario            │
├───────────────────────────────────────┤
│                                       │
│            CUERPO (formato)           │  grilla / ranking / niveles / tarjeta
│                                       │
├───────────────────────────────────────┤
│ LEYENDA de la escala (si hay notas)    │
│ FIRMA  ◉ marca            dominio/ruta │  wordmark + URL corta
│ créditos: carátulas Cover Art Archive  │  IBM Plex Mono, pequeño
└───────────────────────────────────────┘
```

- Fondo `--color-ink`, superficies `--color-ink-surface`, texto `--color-paper` / `--color-paper-muted`
  (tokens de [`design-tokens-naming.md`](../02-architecture/design-tokens-naming.md)). Las imágenes se
  generan siempre en el tema oscuro de la marca, independiente del tema del visitante.
- Números siempre en IBM Plex Mono (la "voz de datos" de la app); títulos en Space Grotesk; citas de
  reseñas en Source Serif 4.
- **Firma**: un único componente de marca (wordmark + dominio) definido en un solo lugar, para que el
  cambio de nombre del producto no toque cada formato.
- **Atribución**: línea mínima de créditos cuando hay carátulas o datos de MusicBrainz (el bloque de
  atribución del footer no puede desaparecer al salir de la app; data-licensing §"atribución").

### 5.2 Rejilla y tamaños

- Una rejilla base de 8 px y márgenes de 64 px en todos los formatos; la cabecera y la firma tienen
  altura fija por formato, de modo que dos láminas distintas puestas lado a lado se reconocen como
  hermanas.
- Historia: el cuerpo vive dentro de la zona segura; cabecera y firma pueden ocupar las franjas que
  Instagram tapa solo parcialmente.

### 5.3 La escala de la casa (color de las notas)

Una sola escala de color para la nota 1–100 en **todas** las láminas: la celda de la gráfica de
discografía, el nivel de la tier list y el sello de nota del Top N usan los mismos tramos y colores.
Es lo que hace que los tres formatos parezcan uno.

| Tramo | Estrellas | Nivel de tier list | Color (propuesta) |
|---|---|---|---|
| 91–100 | 5★ | S | **VU Gold** (`--color-amber`) — único tramo dorado |
| 81–90 | 4.5★ | A | tono cálido derivado del oro, apagado |
| 71–80 | 4★ | B | neutro cálido |
| 61–70 | 3.5★ | C | `--color-petrol` |
| 41–60 | 2.5–3★ | D | petróleo oscuro |
| 1–40 | ≤2★ | E | `--color-danger` atenuado |

- **The Rarity Rule** de [`DESIGN.md`](../../DESIGN.md) se cumple por construcción: el dorado queda
  reservado a lo excepcional (91–100), que en una discografía real son pocas celdas — "lo único que
  brilla en la oscuridad" es lo que la persona más quiere.
- Los tramos coinciden con los rangos de 10 puntos de las estrellas (business-rules "Valoraciones"):
  una valoración solo con estrellas cae en su tramo sin inventar un número.
- **Leyenda con rangos numéricos**, no adjetivos ("Basura", "Malo"): calificar en nombre de la persona
  contradice el rating como identidad (principio 5.2). Etiquetas con nombre propio de la marca son
  opcionales (§8 D11).
- Los colores exactos se validan en la implementación con el validador de paleta (contraste del número
  dentro de la celda ≥ 4.5:1, distinguibles con daltonismo). El número siempre va escrito: el color
  refuerza, nunca es el único portador del dato.

### 5.4 Componentes compartidos

`LaminaFrame` (marco), `ScoreChip` (nota + color de tramo; estrellas cuando no hay detallada),
`CoverTile` (carátula con su fallback tipográfico), `ScaleLegend`, `BrandSignature`. Cada formato es
solo un "cuerpo" distinto dentro del mismo marco.

### 5.5 Carátulas en las imágenes (licencia)

- Se usan **las mismas miniaturas de 250 px** del espejo (ADR 0018) a través del servicio de carátulas;
  nunca otra resolución ni URLs armadas a mano.
- Consecuencia de diseño: ninguna carátula se dibuja a más de ~270 px de lado en un lienzo de 1080 (un
  3×3 de 1080 ronda los 300 px — al límite; el Top 10 de 5 columnas da ~180 px). Los formatos se
  diseñan alrededor de esa medida en lugar de estirar la carátula.
- Un disco con carátula retirada o sin carátula muestra el `CoverTile` tipográfico (título + artista).
- **Pendiente de confirmar (§8 D6):** que una imagen compuesta que el usuario descarga y publica sigue
  siendo "uso de identificación del contenido" en los términos de §C de data-licensing. Es la práctica
  de toda la industria de estos formatos, pero es una ampliación de la política y merece un ADR.

---

## 6. El bucle viral

1. Ana publica su lámina de Metallica en una historia con el enlace.
2. Leo (sin cuenta) abre el enlace: ve la lámina interactiva completa, sin muro de registro.
3. Llamado principal: **"Arma la tuya"** → registro → va **directo a armarla, con el formato y el tipo
   preseleccionados** y el título de la otra lámina como sugerencia para tocar. La bienvenida queda pendiente e
   Inicio la sigue ofreciendo. La intención es el id de la lámina (`lamina=<uuid>`), nunca una URL (ADR 0052).
4. Leo valora la discografía (el editor de la lámina es también una forma rápida de valorar en lote,
   §8 D12) y publica la suya.
5. Si Leo ya tenía cuenta: **"Compárala con la tuya"** → lámina "Tú vs. Ana" (§4.4.2), que se comparte de
   nuevo.

Atribución del tráfico: parámetro corto `?via=<formato>` en los enlaces compartidos (sin identificador
de quien compartió más allá del `@usuario` que ya está en la ruta). No hay analítica de producto hoy;
qué medir y dónde se guarda es decisión aparte (§8 D13).

---

## 7. Arquitectura técnica (propuesta)

### 7.1 Un solo renderizador en el servidor

- **`next/og` (`ImageResponse`)**, que viene con Next 15 — no suma dependencias. Escribe la imagen como
  JSX con un subconjunto de flexbox, lo que permite reutilizar los componentes de marco de la §5.4 en
  todos los formatos y garantiza la coherencia visual.
- Runtime **Node** (no edge): las carátulas del espejo son WebP y hay que verificar si el motor de
  `next/og` las acepta; si no, se convierten con `sharp`, que ya es dependencia.
- **Fuentes:** el motor necesita los archivos TTF/OTF (no woff2 ni fuentes variables): se versionan en el
  repo las tres familias en los pesos usados (licencia OFL). `next/font/google` no sirve aquí porque no
  expone los bytes.
- Se descarta el renderizado en el cliente (canvas / html-to-image): suma dependencias, depende del CORS
  de las carátulas, y la imagen del enlace la necesitan los crawlers sin navegador.

### 7.2 Rutas

- Imagen del enlace: convención de Next `opengraph-image.tsx` (+ `twitter-image`) por ruta de destino,
  con `generateMetadata` para título y descripción. Recordar `params` como `Promise` (Next 15).
- Formatos a pedido (Historia, Publicación, Cuadrado, descarga): un route handler
  `/api/share/image/<tipo>/<id>?format=story` envuelto en `with-error-handling`, que aplica las mismas
  reglas de visibilidad que la página.

### 7.3 Caché y costo

- Clave de caché = tipo + id + formato + idioma + **versión del contenido** (p. ej. `updated_at` de la
  valoración/lista, o un hash de los datos de la lámina) + estado (visible/oculto). Con la versión en la
  URL la respuesta puede ser `immutable` en el CDN.
- Láminas derivadas (discografía, año): la versión es el máximo `updated_at` de las valoraciones que
  entran; cambiar una nota cambia la URL de la imagen.
- Límite de tasa por usuario para la generación a pedido; las imágenes OG solo se generan cuando un
  crawler las pide.
- Presupuesto a medir en la primera fase: imagen OG < 300 ms en caliente, Historia < 800 ms. Medido: Enlace 0,1–0,3 s; Historia 0,9–1 s en caliente, por encima del presupuesto (`add-share-user-actions-phase3`).

### 7.4 Datos y persistencia (a decidir, §8 D7)

- Láminas derivadas: sin tabla; se calculan desde `rating`, `diary`/escuchas y el recorrido.
- Láminas de autor: candidata a **reutilizar `user_list`** con nuevos `kind` (`top`, `tier_list`) y una
  columna `tier` en el ítem, en vez de una entidad nueva — hereda audiencia, guardados, reportes,
  moderación, feed y exportación de datos (mismo razonamiento que el precedente 6.4 de
  product_philosophy). La alternativa es una tabla propia `lamina` con configuración JSON. Cualquiera de
  las dos va con migración nueva, espejo en `schema.ts` y `sql-model.md`.

### 7.5 Accesibilidad e i18n

- Toda imagen compartida tiene su contraparte HTML accesible (la página); la imagen OG lleva `alt`
  descriptivo generado ("Valoraciones de Ana para la discografía de Metallica").
- Textos de imagen en `next-intl`; si un componente cliente nuevo usa `useTranslations`, regenerar
  `client-messages` (ADR 0048).

---

## 8. Decisiones

Adoptadas el 2026-11-04 como punto de partida. No son definitivas: cada cambio de la §9 repasa en
detalle las que le tocan y, si las corrige, actualiza esta tabla en el mismo cambio. D9 sigue abierta
hasta tener datos reales.

| # | Decisión | Opciones | Adoptada |
|---|---|---|---|
| D1 | Nombre visible de la familia de gráficos | Láminas · Postales · Carteles · Afiches · sin nombre propio | ✅ **Láminas** (es) / *Cards* (en), confirmada en `add-share-foundation` |
| D2 | Orden de construcción | A completo y luego B · intercalar | **A primero** (§9): B necesita el renderizador, la hoja de compartir y las páginas de destino de A |
| D3 | Formatos del bloque A | Solo enlace · enlace + historia · todos | ✅ **Enlace + Historia**, esta en 1080×1920 con la carátula a 250 px sobre un vinilo dibujado (`add-share-user-actions-phase3`); Publicación/Cuadrado con B |
| D4 | Página de relación persona ↔ disco | `/users/<u>/album/<id>` única · una página por acción | ✅ **Única por objeto** (álbum y canción en `add-share-user-actions-phase2`; el artista llega con la lámina de discografía, que es a la vez el progreso público) |
| D5 | Compartir algo privado | Bloquear · pedir hacerlo público · permitir solo descarga | ✅ **Pedir "Hacer pública y compartir"**; sin ese gesto, solo el dueño descarga la imagen, generada con su sesión y sin caché pública (sirve también a perfiles privados). ADR 0050 |
| D6 | Carátulas compuestas en imágenes descargables | Permitir con 250 px y atribución · solo carátula única · sin carátulas | ✅ **Hasta 4 carátulas de ≤250 px sin ampliar, con créditos y respetando retiros** — ADR 0049 (`add-share-foundation`). **Hasta 10 en una Lámina armada por una persona** (`add-top-n-lamina`) |
| D7 | Persistencia de láminas de autor | `user_list` con `kind` nuevos · tabla `lamina` | ✅ **`user_list` con `kind = 'top'`**: las superficies de listas ya filtran por `standard`. La tier list lo revisa al llegar |
| D8 | ¿La tier list escribe valoraciones? | No · ofrecer "actualizar mis notas" | **No**; quizá un "¿actualizar tu nota?" puntual en una fase posterior |
| D9 | Umbral para la vista "Por canción" | ≥ x % de pistas valoradas · ≥ N pistas | ✅ **10 canciones valoradas en al menos 2 discos** (`add-discography-lamina-phase2`), en una constante (`DISCOGRAPHY_SONG_MIN`). Sin datos reales todavía: la BD de scratch tenía 49 valoraciones de canciones. Revisar cuando la BD real las tenga |
| D10 | Grilla 3×3 sin números | Incluir · solo Top 5/10 | ✅ **Incluir como formato del Cuadrado** (es el que la gente ya conoce) |
| D11 | Etiquetas de la escala | Solo rangos numéricos · nombres de marca | **Rangos numéricos** por defecto |
| D12 | El editor de lámina como valoración en lote | Sí · no | ✅ **Sí, para la discografía** (`add-discography-lamina-phase3`): `?valorar=1` lista los discos sin nota con sus estrellas, y la Lámina de cada álbum, sus canciones. Guarda al tocar, con la API de siempre. No desde las celdas de la grilla: a 375 px son chicas |
| D13 | Métricas de compartir | Contador propio (`share_event`) · solo `?via=` en logs · nada | ✅ **`share_event` (migración 0079, sin datos personales) + `?via=<canal>`** en los enlaces (`add-share-foundation`) |
| D14 | ¿Las láminas de autor generan entrada en el feed? | Sí · no | **Sí**, como una lista nueva, con la audiencia de la lámina |
| D15 | Cómo se hace pública una valoración (`rating` no tiene audiencia: la ven dueño y seguidores, salvo destacadas y la que acompaña a una reseña) | Marca por valoración · columna `audience` · reutilizar destacadas | ✅ **Marca por valoración en tabla aparte**, como `rating_highlight`: sin tope, reversible y sin tocar `rating.updated_at`. Las destacadas no sirven: tope de 6 y cambian la vitrina del perfil |
| D17 | ¿Una valoración compartida muestra el puntaje detallado? | Sí, como las destacadas · solo estrellas | ✅ **Sí**: compartir es una decisión explícita del dueño. La marca sigue al editar (muestra la nota vigente) y se borra con la valoración |
| D18 | Audiencia de una Lámina armada desde una fuente | Nace privada · audiencia por defecto | ✅ **Nace "Solo yo"**, y lo hace cumplir el servidor: favoritos, listas o escuchas privadas pueden terminar en ella (`add-top-n-lamina-phase2`). Se publica con "Hacer pública y compartir". Completar una Lámina existente no cambia su audiencia, pero avisa |
| D19 | Cómo se hace pública una discografía, si `rating` no tiene audiencia | Marca por artista · foto fija · nunca pública | ✅ **Marca por artista** (`discography_share`, `add-discography-lamina-phase1`): reversible y al día con las notas nuevas. La hoja lo avisa antes del gesto |
| D16 | Dirección de un comentario (un ancla no llega al servidor y los metadatos del álbum viven en un layout sin `searchParams`) | Página `/comment/<id>` · solo `?thread=` | ✅ **Página propia**: lleva la cita en la vista previa; "Ver la conversación" abre `?thread=`, que pasa a funcionar también en álbum y canción |

---

## 9. Plan de cambios (OpenSpec, en orden)

Cada cambio parte de este documento y abre con el repaso en detalle de las decisiones que le tocan
(§8): se confirman o se corrigen ahí, antes del propose.

**Bloque A**

1. **`add-share-foundation`** ✅ archivado — renderizador (`next/og` + fuentes + carátulas), marco y
   componentes de la §5.4, escala de la casa, `ShareSheet`, imágenes OG + `generateMetadata` en catálogo
   (álbum, artista, canción, género, premios, salones, colecciones) y perfil. Decisiones: D1, D3, D6, D13.
   Hallazgos: `next/og` no acepta WebP (se convierte con `sharp`); la ficha de un premio o de un salón
   redirige a su última ceremonia o clase, así que no tiene imagen propia; los glifos fuera del subconjunto
   latin los pide `next/og` a Google Fonts en el momento (ADR 0049, consecuencias).
2. **`add-share-user-actions`**, dividido en tres fases (2026-11-05):
   - **`add-share-user-actions-phase1`** ✅ implementado — imagen, metadatos y botón en lo que ya es público y tiene página
     (reseña, lista, Camino, colección, huella), también en las páginas de gestión del dueño; página
     `/comment/<id>` y botón en cada comentario raíz (D16); `?thread=` en álbum y canción. Corrige de paso que
     una lista o un Camino ocultos por moderación se leían con la URL directa.
   - **`add-share-user-actions-phase2`** ✅ implementado — páginas de relación de álbum y canción (D4), marca de valoración
     compartida (D15), imágenes de valoración y escucha, flujo "Hacer pública y compartir" y descarga privada
     del dueño (D5).
   - **`add-share-user-actions-phase3`** ✅ implementado — formato Historia (D3) en todo lo que tiene Enlace, ofrecimiento en
     momentos con significado (§3.4) y acción Compartir en los menús ⋯ de las filas.

**Bloque B**

3. **`add-top-n-lamina`**, dividido en tres fases (2026-11-06). Primera versión con álbumes y canciones; los artistas quedan para después,
   porque cada foto exige su crédito. Notas apagadas por defecto.
   - **`add-top-n-lamina-phase1`** ✅ implementado — modelo, editor a mano, página pública, formatos Publicación y Cuadrado, feed (D6, D7, D10, D14).
   - **`add-top-n-lamina-phase2`** ✅ implementado — armar desde valoraciones, favoritos y listas, con filtros y títulos sugeridos (D18).
   - **`add-top-n-lamina-phase3`** ✅ implementado — "Arma la tuya" con registro dirigido (§6, ADR 0052).
4. **`add-discography-lamina`**, dividido en tres fases (2026-11-07). "Compárala con la tuya" pasa a "Tú vs. otra persona" (§4.4).
   - **`add-discography-lamina-phase1`** ✅ implementado — página, marca por artista, vista Por disco, progreso discreto (D4, D19, ADR 0053).
   - **`add-discography-lamina-phase2`** ✅ implementado — vista Por canción (D9), preferencias del dueño (En vivo, Recopilatorios y vista por defecto) y Lámina de álbum en `?disco=`, abierta por la misma marca.
   - **`add-discography-lamina-phase3`** ✅ implementado — "Valora lo que falta" (D12) en discos y canciones, y "Arma la tuya" en esta página (ADR 0054).
5. **`add-tier-list-lamina`** — tier list con prellenado desde valoraciones, editor accesible (D8).
6. **Siguientes** (§4.4) — "Tu año en discos" (objetivo: antes de diciembre), "Tú vs. otra persona",
   décadas/géneros, mes en discos, pared de la colección.

Documentos a actualizar en cada cambio: `business-rules.md` (visibilidad de lo compartido),
`domain-model.md` (lámina si se vuelve entidad), `04-api/contracts.md` (rutas de imagen),
`sql-model.md` (si hay migración), `data-licensing.md` + ADR nuevo (D6), y este documento (estado).
