## MODIFIED Requirements

### Requirement: Estados de búsqueda
La interfaz SHALL mostrar un estado de carga mientras la página resuelve la búsqueda y SHALL
deshabilitar el envío del formulario mientras la navegación está en curso. Esto vale para los tres
puntos de envío: el campo de `/search`, el buscador compacto del Header y el formulario de
`/search/advanced`. Mientras una búsqueda nueva se resuelve en la misma página (cambio de URL sin
cambio de ruta), los resultados anteriores SHALL quedar marcados como pendientes (atenuados y con
`aria-busy="true"`) hasta que lleguen los nuevos. La página de resultados SHALL NOT mostrar un aviso
de "primera importación": la búsqueda ya no ingiere discografías, y ese aviso pertenece a las vistas
de artista y álbum cuando ingieren su contenido en la primera visita.

#### Scenario: Búsqueda en progreso
- **WHEN** la página está resolviendo la búsqueda para el `q` recibido
- **THEN** la interfaz muestra un estado de carga neutro y el botón de búsqueda queda
  deshabilitado

#### Scenario: La página de resultados nunca afirma una primera importación
- **WHEN** la página muestra resultados o un estado vacío
- **THEN** en ningún caso aparece el aviso de "primera importación"

#### Scenario: Envío desde el formulario avanzado
- **WHEN** una persona envía el formulario de `/search/advanced` con resultados ya en pantalla
- **THEN** el botón Buscar queda deshabilitado, los resultados anteriores se atenúan con
  `aria-busy="true"` y, al llegar la página nueva, se reemplazan y el botón vuelve a habilitarse

#### Scenario: Envío desde el Header
- **WHEN** una persona envía una búsqueda desde el buscador compacto del Header
- **THEN** el botón de envío del Header queda deshabilitado y muestra que la búsqueda está en
  curso hasta que la navegación termina

### Requirement: Resolución de canciones hacia álbumes que las contienen

En el tipo **Canciones** (y solo en él), la búsqueda SHALL detectar grabaciones (`recording`) que
coinciden con la consulta —en la base local, en MusicBrainz o en ambas— y SHALL exponer, por
cada grupo (canción, artista) de la capacidad `search-query-matching`, los álbumes
(`release_group`) que la contienen, calculados como **unión** de las dos fuentes dentro del
grupo (ninguna grabación individual de MusicBrainz tiene todas las apariciones de una canción).
Cualquier versión de la canción (estudio, en vivo, remix) cuenta como aparición de la misma
canción. Cuando la interpretación elegida tiene artista (ver "Detección del artista en
Canciones" en `search-query-matching`), la búsqueda de recordings SHALL acotarse a los
release-groups propios de ese artista mediante la cláusula de campos
`"<canción>" AND (rgid:… OR rgid:…)`, con la lista de rgids ordenada por categoría de álbum
(estudio primero) antes de aplicar el tope de la cláusula: el texto libre y la búsqueda por
nombre de artista están contaminados por bootlegs y covers, y hay grabaciones canónicas sin
artist-credit que ninguna consulta por artista encuentra. Sin lista de rgids disponible se
degradará a `"<canción>" AND artist:"<artista>"`. Todo candidato SHALL pasar el filtro de
relevancia de título: contención mutua (normalizada) entre el título y la parte de canción,
tolerando como máximo 2 tokens extra en el título. Del primer grupo, en orden de score, el
sistema SHALL tomar los primeros cuatro candidatos y leer sus apariciones de las ediciones
(`releases`, con su release-group embebido) que trae la **propia respuesta de la búsqueda de
recordings**, sin ninguna solicitud adicional a MusicBrainz, y SHALL unirlas con las de las
`recording` locales del grupo que tengan tracks ingeridos; la identidad del grupo (`recordingId`,
`mbid`, `title`, `artistName`) SHALL ser la contribución con más ediciones y SHALL ser la única
grabación ingestionada por búsqueda. Los release-groups de las apariciones de los cuatro candidatos
SHALL persistirse como stubs en una sola operación. La deduplicación de la unión SHALL ser por
`release_group`, propagando el año mínimo entre fuentes. Cada álbum SHALL incluir `id` local,
`mbid`, título, categoría y año (año del release más antiguo del grupo, si se conoce), ordenados por
categoría (`studio` → `single_ep` → `compilation` → `live_other`), luego año ascendente, luego
título, con un máximo de 12. Si la resolución falla o no produce candidato aceptable, el tipo
Canciones SHALL responder con una lista vacía (o con la marca `remoteFailed` si falló MusicBrainz),
sin afectar a ningún otro tipo.

#### Scenario: Artista más canción con discografía ingerida
- **WHEN** una persona busca `Sabrina Carpenter taste` en Canciones y los release-groups de
  Sabrina Carpenter ya existen en la base local (créditos ingeridos)
- **THEN** la búsqueda de recordings se ejecuta con cláusula `"taste" AND (rgid:… OR rgid:…)`
  sobre sus álbumes propios (ordenados por categoría, sin browse de discografía) y el primer
  grupo muestra "Taste" con los álbumes que la contienen (entre ellos *Short n' Sweet*)

#### Scenario: Grabación canónica sin artist-credit
- **WHEN** la grabación canónica de la canción no tiene artist-credit en MusicBrainz (defecto de
  datos, como el *Stairway to Heaven* de estudio) y por tanto ninguna consulta por artista la
  encuentra
- **THEN** la cláusula `rgid` sobre el álbum del artista interpretado sí la encuentra y el grupo
  lista ese álbum (p. ej. `[Led Zeppelin IV]` para `Led Zeppelin Stairway to Heaven`)

#### Scenario: Bootleg homónimo desplazado
- **WHEN** el primer candidato de recordings tiene un título que contiene la consulta más de 2
  tokens extra (ej. `sabrina carpenter - taste (dudda bootleg)` para `taste`)
- **THEN** el candidato es descartado y la selección continúa con el siguiente que sí pasa el
  filtro

#### Scenario: Grabaciones duplicadas, identidad canónica y unión de versiones
- **WHEN** la búsqueda de recordings devuelve varias grabaciones de la misma canción y el mismo
  artista (tomas de estudio, lives, remixes, malvinculaciones) y ninguna individual tiene todas
  las apariciones
- **THEN** se leen las ediciones de los primeros 4 candidatos del grupo (en orden de score) desde
  la respuesta de la búsqueda, el grupo muestra la UNIÓN de sus álbumes, y la identidad
  (`recordingId`/`title`) corresponde a la de más ediciones — la única grabación que se ingesta

#### Scenario: La sección no encoge cuando se abre un álbum
- **WHEN** una canción ya tiene una aparición local (el usuario abrió uno de sus álbumes y el
  tracklist quedó ingerido) y MusicBrainz conoce además otras apariciones (compilaciones, lives)
- **THEN** el grupo fusiona ambas fuentes y lista MÁS álbumes que con la sola fuente local,
  nunca menos; la pata de MusicBrainz corre en toda búsqueda de Canciones (la búsqueda de
  recordings, cacheada por consulta)

#### Scenario: Canción cacheada localmente con MusicBrainz caído
- **WHEN** la consulta coincide con una `recording` local que tiene apariciones ingeridas pero la
  pata de recordings de MusicBrainz falla
- **THEN** el grupo se construye desde la base local (degradación explícita) y la respuesta lleva
  `remoteFailed: true`

#### Scenario: Consulta que no es una canción
- **WHEN** una persona busca `xyzzyplugh 123` en Canciones y ningún candidato de recordings pasa
  el filtro de relevancia
- **THEN** la respuesta es una lista vacía y la página ofrece buscar el texto en los otros tipos

#### Scenario: Fallo de la pata de grabaciones sin fuente local
- **WHEN** la búsqueda de recordings o la resolución de apariciones falla y no hay apariciones
  locales
- **THEN** el endpoint responde con `code: INTERNAL_ERROR` para el tipo Canciones, y las
  búsquedas de Artistas y Álbumes no se ven afectadas

#### Scenario: Apariciones sin solicitudes extra
- **WHEN** una persona busca `radiohead - creep` en Canciones con la caché fría
- **THEN** no se emite ningún browse de apariciones (`/release?recording=`) y el primer grupo lista
  los álbumes de las ediciones que trae la búsqueda de recordings, incluidas las que pasan de 100
  en una misma grabación

### Requirement: Presupuesto de MusicBrainz por tipo

Cada búsqueda SHALL limitar sus solicitudes a MusicBrainz según el tipo: **Artistas**, una
búsqueda de artistas; **Álbumes**, una búsqueda de release-groups; **Usuarios**, ninguna;
**Canciones**, una búsqueda de artistas para detectar la interpretación, como máximo un browse de
discografía por interpretación probada (solo si no hay créditos locales) y como máximo dos
búsquedas de recordings (una por interpretación). Ninguna búsqueda SHALL hacer browse de
apariciones de una grabación (`/release?recording=`), tampoco en **Canciones con `purpose=pick`**.
"Cargar más" SHALL costar una solicitud. Todas las búsquedas SHALL compartir la caché TTL del
cliente de MusicBrainz.

#### Scenario: Buscar un artista
- **WHEN** una persona busca `Sabrina Carpenter` en Artistas con la caché fría
- **THEN** se emite exactamente una solicitud a MusicBrainz

#### Scenario: Consulta repetida
- **WHEN** la misma búsqueda de álbumes se repite dentro de la TTL
- **THEN** no se emite ninguna solicitud a MusicBrainz

#### Scenario: Canciones en modo de elección
- **WHEN** se busca `megadeth rust in peace` en Canciones con `purpose=pick` y la caché fría
- **THEN** no se emite ningún browse de apariciones (`/release?recording=`) y el total de solicitudes a
  MusicBrainz es como mucho cuatro (artistas, un browse de discografía, dos búsquedas de recordings)

#### Scenario: Canciones sin modo de elección
- **WHEN** se busca `pink floyd time` en Canciones (sin `purpose`) con la caché fría
- **THEN** el total de solicitudes a MusicBrainz es como mucho cuatro (artistas, un browse de
  discografía, dos búsquedas de recordings) y ninguna es un browse de apariciones

### Requirement: Resultados locales sin esperar a MusicBrainz

En los tipos Artistas, Álbumes y Canciones, tanto en `/search` como en `/search/advanced`, la página
SHALL renderizar primero las coincidencias locales y SHALL transmitir por streaming las de
MusicBrainz cuando lleguen, con un indicador de carga en la zona pendiente. En el tipo Artistas de
`/search`, la redirección por coincidencia exacta única SHALL decidirse en la parte transmitida, con
la respuesta de MusicBrainz (la misma regla que sin streaming): si corresponde, la página redirige
al perfil aunque la lista local ya se haya mostrado. El resultado final SHALL ser el mismo orden
determinista que sin streaming.

#### Scenario: Álbum ya conocido
- **WHEN** una persona busca `kiss destroyer` en Álbumes y *Destroyer* existe localmente
- **THEN** *Destroyer* se ve de inmediato y los resultados de MusicBrainz aparecen después sin
  desplazar el orden final

#### Scenario: Artista ya conocido con homónimos
- **WHEN** una persona busca `kiss` en Artistas, Kiss existe localmente y MusicBrainz conoce otros
  artistas llamados Kiss
- **THEN** Kiss se ve sin esperar a MusicBrainz y, al llegar su respuesta, la lista final incluye
  los homónimos sin redirigir

#### Scenario: Artista exacto único
- **WHEN** una persona busca `the cure` en Artistas desde el Header y MusicBrainz confirma que es
  la única coincidencia exacta
- **THEN** la página muestra primero lo local y, al llegar la respuesta de MusicBrainz, redirige al
  perfil de The Cure, tanto en la navegación desde el Header como abriendo la URL directamente

#### Scenario: Artistas sin nombre en la búsqueda avanzada
- **WHEN** una persona busca grupos de Chile de 1980 a 1989 en `/search/advanced`
- **THEN** las coincidencias locales se ven sin esperar a MusicBrainz y la lista final con
  "Cargar más" llega después

### Requirement: Persistencia de stubs desde la búsqueda

Por cada resultado de MusicBrainz que no exista aún en la base local, el endpoint SHALL
persistir un stub en una única operación por tipo (`INSERT ... ON CONFLICT (mbid) DO NOTHING`),
de modo que cada elemento de la lista tenga un `id` local. Los stubs de artista SHALL guardarse
con su `type` real derivado de la respuesta de búsqueda de MusicBrainz; si MusicBrainz no informa
el tipo, el stub SHALL guardarse como `unknown` (nunca como `various`, reservado a Various
Artists), para que el enriquecimiento de stubs lo resuelva en la primera visita. Los stubs de
álbum SHALL guardarse con su `category` derivada de `primary-type` / `secondary-types`. Los
créditos que trae la búsqueda de release-groups SHALL guardarse solo para los álbumes que aún no
tienen créditos, en lote: una operación para los artistas acreditados y una para los créditos,
sin importar cuántos resultados traiga MusicBrainz. Repetir una búsqueda cuyos álbumes ya tienen
créditos SHALL NOT escribir créditos ni artistas.

#### Scenario: Resultado nuevo de MusicBrainz
- **WHEN** la búsqueda devuelve un artista que no estaba en la base local
- **THEN** se crea un stub de ese artista con su `type` y el elemento de la lista lo referencia
  por su `id` local

#### Scenario: Resultado ya conocido
- **WHEN** la búsqueda devuelve un artista cuyo `mbid` ya existe en la base local
- **THEN** no se crea un duplicado y el elemento referencia la fila existente

#### Scenario: Artista sin tipo en MusicBrainz
- **WHEN** la búsqueda devuelve un artista nuevo sin campo `type` (p. ej. un "Icon" de trance)
- **THEN** el stub se guarda con `type = 'unknown'` y la lista lo muestra sin etiqueta de tipo

#### Scenario: Álbumes nuevos con créditos
- **WHEN** una búsqueda de Álbumes trae de MusicBrainz 20 álbumes que no estaban en la base
- **THEN** sus artistas acreditados y sus créditos se guardan en dos operaciones en total y cada
  álbum queda con su artista principal

#### Scenario: Búsqueda de álbumes repetida
- **WHEN** la misma búsqueda de Álbumes se repite y todos sus álbumes ya tienen créditos
- **THEN** no se escribe ningún crédito ni artista
