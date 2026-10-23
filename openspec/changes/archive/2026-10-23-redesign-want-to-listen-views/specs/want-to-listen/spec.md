## REMOVED Requirements

### Requirement: Página de Pendientes legible en todo ancho
**Reason**: describía acciones de texto en cada vista (debajo del título, apiladas en la tarjeta); las acciones pasan a
un menú `⋯`.
**Migration**: reemplazado por "Vistas de Pendientes", que conserva el ancho único y el título siempre legible.

### Requirement: Acción de discografía estable en Pendientes
**Reason**: la acción de discografía deja de ser un enlace visible en la entrada y pasa al menú, así que no ocupa
espacio en la fila.
**Migration**: ver "Menú de acciones de una entrada de Pendientes" (mismo nombre, "Completar discografía").

### Requirement: Controles táctiles y avisos al quitar en Pendientes
**Reason**: quitar deja de confirmarse en dos pasos y pasa a ofrecer Deshacer.
**Migration**: reemplazado por "Quitar y Ya lo escuché con Deshacer en Pendientes", que conserva las áreas táctiles,
el anuncio y el error junto a la entrada.

## ADDED Requirements

### Requirement: Contenido de cada entrada de Pendientes
El listado propio SHALL incluir, para una entrada de artista, su foto (`coverThumbUrl`, `null` si no tiene) y, para
una entrada de álbum, su año de primera publicación (`year`) y su categoría (`category`: `studio`, `single_ep`,
`compilation` o `live_other`), ambos `null` si no se conocen. La página SHALL mostrar la foto del artista en círculo
(con la inicial como respaldo), "artista · año · tipo" bajo el título de un álbum y, en Detallada e Índice, cuánto
hace que se anotó cada entrada.

#### Scenario: Álbum con datos
- **WHEN** el usuario ve "Dr. Feelgood" en Detallada
- **THEN** debajo del título lee "Mötley Crüe · 1989 · Álbum de estudio" y cuánto hace que lo anotó

#### Scenario: Artista sin foto
- **WHEN** un artista de la lista no tiene foto
- **THEN** se muestra su inicial en un círculo

### Requirement: Ya lo escuché desde Pendientes
Cada entrada SHALL ofrecer "Ya lo escuché", que registra una escucha del objetivo en el Diario; por la auto-remoción,
la entrada SHALL salir de la lista y su conteo SHALL descontarse. La página SHALL avisar que quedó en el Diario y
ofrecer Deshacer, que borra esa escucha y vuelve a anotar el objetivo en Pendientes.

#### Scenario: Cerrar un pendiente
- **WHEN** el usuario elige "Ya lo escuché" en "Short n' Sweet"
- **THEN** se registra la escucha, el álbum sale de la lista y un aviso dice que quedó en el Diario, con Deshacer

#### Scenario: Deshacer
- **WHEN** pulsa Deshacer en ese aviso
- **THEN** la escucha se borra y el álbum vuelve a la lista

### Requirement: Menú de acciones de una entrada de Pendientes
Cada entrada SHALL tener un botón `⋯` que abre un menú con: "Ya lo escuché", "Completar discografía" (artista sin
recorrido) o "Ver tu discografía" (artista con recorrido), "Añadir a una lista" y "Quitar de Pendientes". El menú
SHALL cerrarse con Escape, con un clic fuera o al elegir, SHALL devolver el foco al botón y SHALL permitir moverse con
las flechas. Mientras no se conoce el estado de recorrido de un artista, la opción de discografía NO SHALL aparecer.
Con puntero grueso, el botón y las opciones SHALL medir al menos 44 px de alto. Un artista con recorrido SHALL mostrar
en Detallada la etiqueta "Discografía en curso".

#### Scenario: Completar discografía desde el menú
- **WHEN** el usuario abre el menú de un artista sin recorrido y elige "Completar discografía"
- **THEN** se activa el recorrido y la entrada muestra "Discografía en curso"

#### Scenario: Escape cierra el menú
- **WHEN** el menú está abierto y pulsa Escape
- **THEN** el menú se cierra y el foco vuelve al botón `⋯`

### Requirement: Quitar y Ya lo escuché con Deshacer en Pendientes
Quitar una entrada SHALL ser inmediato, sin confirmación, y SHALL mostrar durante 6 s un aviso (`role="status"`) con
Deshacer, que vuelve a anotarla. Solo SHALL haber un aviso a la vez: una acción nueva reemplaza al anterior. Si quitar
o registrar la escucha falla, el error SHALL mostrarse junto a esa entrada con `role="alert"` y la entrada SHALL seguir
en la lista; el error de "Cargar más" SHALL mostrarse junto al botón. Con puntero grueso, Deshacer y el conmutador de
modo SHALL medir al menos 44 px de alto.

#### Scenario: Quitar y deshacer
- **WHEN** el usuario quita "Dua Lipa" y pulsa Deshacer
- **THEN** Dua Lipa vuelve a la lista

#### Scenario: Error al quitar junto a la entrada
- **WHEN** quitar un álbum falla
- **THEN** el aviso de error aparece bajo ese álbum y la entrada sigue en la lista

### Requirement: Vistas de Pendientes
`/me/want-to-listen` SHALL usar el mismo ancho máximo en los tres modos, con el título alineado a la izquierda, y el
título de una entrada NO SHALL quedar reducido por sus acciones. **Detallada** SHALL mostrar filas separadas por una
línea (sin tarjetas) con carátula o foto, título, datos, "Ya lo escuché" visible desde `sm` y el `⋯`. **Índice** SHALL
ser una tabla con encabezados: Título, Artista y Año (álbumes), Anotado y acciones; en pantallas angostas SHALL quedar
Título (con el artista debajo) y acciones. **Gráfico** SHALL mostrar la carátula o foto con el `⋯` sobre ella y un pie
con el título y "artista · año" (álbum), sin acciones de texto.

#### Scenario: Índice como tabla
- **WHEN** el usuario elige Índice
- **THEN** cada sección es una tabla con encabezados de columna

#### Scenario: Título completo en móvil
- **WHEN** abre la página a 375 px en Detallada
- **THEN** el nombre de cada artista se lee completo y "Ya lo escuché" está en el menú `⋯`
