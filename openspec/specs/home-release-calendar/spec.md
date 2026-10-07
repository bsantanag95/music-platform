# home-release-calendar Specification

## Purpose
Riel "Lanzamientos recientes y próximos" de Inicio con datos reales: calendario sincronizado a diario desde el feed
"Fresh Releases" de ListenBrainz en una tabla aparte del catálogo (ADR 0029), filtros de calidad verificados en
MusicBrainz, selección anónima por relevancia, selección personal según la relación de la persona con artistas y la
página de un disco que aún no salió.

## Requirements
### Requirement: Calendario de lanzamientos desde ListenBrainz
El sistema SHALL mantener un calendario de lanzamientos en una tabla propia (`release_calendar_entry`),
separada del catálogo, alimentada por el feed "Fresh Releases" de ListenBrainz con una ventana de 30 días
hacia atrás y 90 hacia adelante desde la fecha de sincronización. Toda request a ListenBrainz SHALL salir
de `src/services/listenbrainz/client.ts`, que SHALL exigir `LISTENBRAINZ_USER_AGENT` y lanzar error si
falta. Una sincronización SHALL reemplazar la ventana completa: las entradas que el feed ya no devuelve
SHALL dejar de existir en el calendario. Las entradas del calendario NO SHALL crear filas de catálogo
por sí mismas.

#### Scenario: Ventana sincronizada
- **WHEN** se sincroniza el calendario el 2026-10-06
- **THEN** el calendario contiene las entradas del feed con fecha entre 2026-09-06 y 2027-01-04, y ninguna
  fuera de ese rango

#### Scenario: Entrada retirada del feed
- **WHEN** un disco estaba en el calendario y la siguiente sincronización ya no lo devuelve (fecha movida
  fuera de la ventana o borrado en MusicBrainz)
- **THEN** el disco desaparece del calendario y del riel

#### Scenario: Sin User-Agent
- **WHEN** `LISTENBRAINZ_USER_AGENT` no está definido y se intenta sincronizar
- **THEN** el cliente lanza error y el calendario existente queda intacto

### Requirement: Refresco diario bajo demanda
El calendario SHALL considerarse vencido 24 horas después de la última sincronización exitosa. Al
renderizar Inicio con un calendario vencido o vacío, el sistema SHALL disparar la sincronización después
de responder (sin bloquear la página) y SHALL servir el calendario existente mientras tanto. Dos
sincronizaciones NO SHALL correr a la vez. Un fallo de ListenBrainz o MusicBrainz SHALL conservar el
calendario anterior. El script `scripts/sync-release-calendar.ts` SHALL permitir forzar la sincronización.

#### Scenario: Calendario vencido
- **WHEN** la última sincronización fue hace 25 horas y alguien abre Inicio
- **THEN** la página se sirve con el calendario actual y se dispara una sincronización en segundo plano

#### Scenario: Visitas concurrentes
- **WHEN** dos visitas a Inicio encuentran el calendario vencido al mismo tiempo
- **THEN** solo una sincronización se ejecuta

#### Scenario: Fallo externo
- **WHEN** ListenBrainz responde con error durante la sincronización
- **THEN** el calendario anterior se conserva y la próxima visita reintenta

### Requirement: Filtros de calidad del calendario
Para ser candidato a mostrarse, un disco SHALL cumplir: fecha exacta al día, tipo primario Álbum o EP,
carátula conocida en el feed (`caa_id`) y, tras la verificación en MusicBrainz, ningún tipo secundario
(se excluyen en vivo, recopilatorio, banda sonora, remix, DJ-mix, demo y similares) y una fecha de primer
lanzamiento del release-group dentro de la ventana (se excluyen reediciones). La verificación SHALL
hacerse sobre los finalistas, con búsquedas por lote a través del cliente de MusicBrainz existente. Un
disco que MusicBrainz no devuelve SHALL quedar sin verificar y no mostrarse hasta una verificación
posterior.

#### Scenario: Disco en vivo
- **WHEN** un finalista es un álbum con tipo secundario "Live" en MusicBrainz
- **THEN** no aparece en el riel

#### Scenario: Reedición
- **WHEN** un finalista tiene en el feed una edición nueva pero su release-group salió por primera vez en 1994
- **THEN** no aparece en el riel

#### Scenario: Sencillo
- **WHEN** un lanzamiento del feed es de tipo "Single"
- **THEN** no es candidato

### Requirement: Selección anónima del riel
Para un visitante sin sesión, el riel SHALL mostrar hasta 12 lanzamientos de los últimos 30 días y hasta
12 de los próximos 60 días, elegidos entre los candidatos por relevancia: la cantidad de oyentes del
artista en ListenBrainz, con un impulso adicional para artistas con actividad en nuestra comunidad
(seguidores, valoraciones, escuchas). La selección SHALL incluir como máximo un disco por artista en todo el riel y como
máximo 3 por familia de géneros en cada lado cuando el género del artista es conocido. Si un lado tiene menos de 4
lanzamientos, la ventana de próximos SHALL ampliarse hasta 90 días antes de rendirse; los filtros de
calidad NO SHALL relajarse. Solo se muestran discos con carátula.

#### Scenario: Ranking por relevancia
- **WHEN** en los próximos 60 días salen discos de un artista con 350.000 oyentes y de otro con 40
- **THEN** el del artista con más oyentes aparece en la selección antes que el otro

#### Scenario: Un disco por artista
- **WHEN** un artista tiene dos discos candidatos en la ventana
- **THEN** solo el más relevante aparece en el riel

#### Scenario: Pocos anuncios
- **WHEN** solo hay 3 candidatos en los próximos 60 días
- **THEN** la ventana de próximos se amplía a 90 días

### Requirement: Selección personal del riel
Para un usuario autenticado, la vista "De tus artistas" del riel SHALL mostrar los lanzamientos (últimos 30 días y próximos hasta 180)
de artistas con los que el usuario tiene relación: los sigue, los tiene en favoritos, valoró con 4
estrellas o más un disco o canción suya, lo escuchó, o tiene un disco suyo en su colección o en "En tu
búsqueda". Los próximos SHALL salir del calendario y, más allá de su ventana, de los release-groups del
catálogo con `first_release_date` futura. El orden de relevancia SHALL ser: sigue, favorito o valoración
alta, escuchas, colección. El riel SHALL mostrar hasta 20 discos. Un disco de un artista que el usuario
sigue SHALL mostrarse aunque no tenga carátula, con el placeholder y la marca "Anunciado". La vista
personal NO SHALL completarse con discos de la selección anónima: lo popular vive en su propia vista.

#### Scenario: Banda seguida anuncia disco
- **WHEN** el usuario sigue a una banda que anunció un álbum para dentro de 4 meses
- **THEN** el álbum aparece en su riel aunque no esté en la selección anónima

#### Scenario: Sin carátula de artista seguido
- **WHEN** el disco anunciado de un artista seguido aún no tiene carátula
- **THEN** la tarjeta muestra el placeholder y la marca "Anunciado"

#### Scenario: Usuario nuevo
- **WHEN** un usuario sin relación con ningún artista abre Inicio
- **THEN** su vista "De tus artistas" está vacía y el riel abre en "Populares"

#### Scenario: Sin relación no se muestra
- **WHEN** un disco del calendario es de un artista con el que el usuario no tiene relación
- **THEN** ese disco no aparece en su vista "De tus artistas"

### Requirement: Selector del riel con sesión
Con sesión, el riel SHALL ofrecer un selector con dos vistas: "De tus artistas" (selección personal) y
"Populares" (selección anónima). Las dos vistas NO SHALL mezclar sus discos ni usar marcas de relleno. El
riel SHALL abrir en "De tus artistas" cuando esta tiene al menos 3 discos y, si no, en "Populares". Cuando
"De tus artistas" tiene menos de 3 discos, el riel SHALL mostrar una invitación a seguir artistas (o
valorarlos y agregarlos a favoritos) con un enlace a la búsqueda. Si "De tus artistas" está vacía y se
selecciona, SHALL mostrar solo la invitación. Si "Populares" está vacía, el selector SHALL ocultarse. Si ambas
vistas están vacías, el apartado SHALL ocultarse. Sin sesión, el riel SHALL mostrar solo la selección
anónima, sin selector.

#### Scenario: Abre en lo personal
- **WHEN** un usuario con 5 discos en "De tus artistas" abre Inicio
- **THEN** el riel abre en "De tus artistas", sin invitación, y puede cambiar a "Populares"

#### Scenario: Pocos discos propios
- **WHEN** un usuario con 1 disco en "De tus artistas" abre Inicio
- **THEN** el riel abre en "Populares" y muestra la invitación a seguir artistas

#### Scenario: Visitante sin sesión
- **WHEN** un visitante sin sesión abre Inicio
- **THEN** el riel muestra la selección anónima sin selector

### Requirement: Discos mostrados enlazan al catálogo
Cada disco elegido para el riel SHALL registrarse como stub de `release_group` (con sus créditos) si no
existía, de modo que la tarjeta enlace a `/album/{id}` y la carátula salga del pipeline existente
(miniatura de 250px, espejo). Solo los discos mostrados SHALL entrar al catálogo. La fecha que muestra la
tarjeta SHALL ser la fecha de primer lanzamiento verificada.

#### Scenario: Disco nuevo en el riel
- **WHEN** un disco que no estaba en el catálogo entra en la selección anónima
- **THEN** existe un `release_group` con su MBID y la tarjeta enlaza a su página

#### Scenario: Candidato no elegido
- **WHEN** un disco del calendario cumple los filtros pero queda fuera de los 24 elegidos
- **THEN** no se crea ninguna fila de catálogo para él

### Requirement: Página de un disco que aún no salió
La página `/album/[id]` de un release-group con `first_release_date` posterior a hoy SHALL mostrar la
fecha como "Se lanza el …" y SHALL funcionar sin tracklist ni ediciones publicadas, con un estado vacío
que indique que el tracklist estará disponible cuando se publique.

#### Scenario: Álbum anunciado sin tracklist
- **WHEN** se abre la página de un álbum que sale en 3 semanas y no tiene ediciones con pistas
- **THEN** la página carga, muestra "Se lanza el …" y el estado vacío del tracklist, sin error

