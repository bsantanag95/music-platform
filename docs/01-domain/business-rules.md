# Reglas de negocio — music-platform

Reglas explícitas que gobiernan el comportamiento del producto, independientes de su implementación técnica (la implementación de cada una vive en `03-data/sql-model.md`).

## Identidad de artistas

- Una persona puede pertenecer a uno o más grupos, y puede tener además su propia carrera solista; ambas se muestran en el mismo perfil.
- Un grupo es en sí mismo un Artista, con perfil y discografía propios.
- "Various Artists" es un Artista especial reservado para álbumes compilatorios sin un artista principal único.

### Alineación de un grupo

- Una persona es **integrante actual** si tiene algún período abierto (sin fin y sin marca de terminado); un período sin fechas y sin terminar cuenta como abierto y se muestra como "período desconocido". Si todos sus períodos terminaron, es **integrante antiguo**.
- Los períodos de una persona fallecida nunca cuentan como abiertos, aunque la fuente los deje sin fin.
- Si el grupo se separó, en lugar de "actuales" se muestra la **Última alineación**: quienes tienen un período que termina en el año de separación o que sigue abierto en la fuente; al mostrarlos, esos períodos terminan con el grupo.
- Los **músicos de apoyo** se clasifican igual (actuales o anteriores) y nunca se mezclan con los integrantes, tampoco en los créditos de un álbum. En un grupo separado todo el apoyo es anterior.
- Orden dentro de cada bloque: fundadores primero, luego por año del primer período (sin año al final) y por nombre.
- Los instrumentos de una persona se agrupan por el conjunto de períodos en que los tocó: quien sumó teclados en su última etapa muestra dos líneas.
- La alineación se renueva cada 30 días junto con la ficha del artista; las otras bandas de cada integrante se completan en segundo plano, con un tope por visita.

## Canciones y versiones

- Una Canción es un único registro de valoración/comentarios, sin importar en cuántas Ediciones o Álbumes aparezca.
- Un remaster de audio **no** genera una Canción nueva: se puntúa independiente de la calidad del remaster.
- Una re-grabación, un remix o una versión en vivo sí cuentan como una Canción nueva y distinta de la original.
- Las versiones de una canción se agrupan por su Obra, pero cada una conserva su propia valoración, diario, favoritos y comentarios: la agrupación nunca fusiona lo social (ADR 0020). El tipo de versión es el que declara MusicBrainz; sin marca, no se deduce.

## Álbumes y ediciones

- La valoración y los comentarios de un Álbum pertenecen al concepto general del álbum, no a cada Edición (original, japonesa, remaster de aniversario) por separado.
- El listado de canciones (Pistas) sí depende de la Edición concreta que se esté mostrando.
- Todo Álbum se clasifica en exactamente una categoría: de estudio, single/EP, compilado, o en vivo/misceláneo.

## Géneros

- Los géneros son los de la lista oficial de MusicBrainz (taxonomía CC0), con su jerarquía
  ("subgénero de", "fusión de", "influido por"). Nunca se usan los votos ni las etiquetas de
  MusicBrainz por artista o álbum (CC BY-NC-SA).
- Cada género pertenece a una o más de 20 **familias** curadas (17 principales y 3 secundarias).
  Latina agrupa Latinoamérica y el Caribe hispano; la música de España va a Folk y cantautor; la
  brasileña es familia propia. Un género sin familia asignable cae en "Del mundo".
- Los **descriptores** (Instrumental, Navideña, Orquestal, Banda sonora) no son estilos: nunca
  cuentan como géneros de un álbum. Los géneros **ocultos** no se muestran ni cuentan.
- Los géneros de artistas y álbumes son **semillas** de Wikidata (P136), a las que se llega solo
  por la relación `wikidata` que declara MusicBrainz. Un álbum sin géneros con puntaje positivo (ni semillas ni
  votos) **hereda** los 3 primeros géneros de estilo de su artista principal, marcados como heredados.
- Las semillas se guardan separadas de los votos de la comunidad: actualizar unas nunca modifica
  los otros.
- **Votos de género del álbum** (cambio `add-genre-votes`, ADR 0025): una persona que **interactuó** con el álbum
  (valoración, entrada de diario o colección), con la cuenta activa y sin suspensión social vigente, vota cada género
  +1 / −1 y propone uno de la taxonomía votándolo +1. Solo estilos visibles (no descriptores ni ocultos), a lo sumo
  8 géneros por persona y álbum; no se vota artista ni canción. **Puntaje** = 1 si es semilla propia + votos de
  cuentas no desactivadas; los géneros del álbum son los de puntaje > 0, el de mayor puntaje es el **principal** y los
  que llegan a la mitad de su puntaje (mínimo 1) los **secundarios**. Sin ningún género con puntaje positivo, el álbum
  hereda del artista. Un voto **sobrevive** a que la persona quite su valoración, entrada o colección (la interacción
  solo se exige al votar). El voto individual es privado y no genera actividad; las cifras de votos son públicas solo
  con al menos 5 votantes distintos.
- Las páginas de artista, álbum y canción muestran sus géneros como chips enlazados a la página del género; los
  heredados se distinguen de los propios y los descriptores van aparte (ver `05-features/genres.md`).
- "Géneros que me mueven" (≤5) acepta cualquier género de estilo de la taxonomía, validado contra la tabla `genre`;
  un género retirado u oculto se ignora al mostrar sin tocar lo guardado (ADR 0024).
- Ver ADR 0023 y `03-data/sql-model.md` (sección "Géneros").

## Créditos de artista

- Un Crédito pertenece a exactamente un objetivo: un Álbum o una Canción, nunca ambos ni ninguno.
- Un mismo Artista no puede tener más de un Crédito sobre el mismo objetivo.
- El orden de aparición de los Créditos (quién va primero) determina cómo se muestra la atribución ("Mark Ronson feat. Bruno Mars", "Queen & David Bowie").

## Valoraciones

- Un Usuario puede valorar exactamente un objetivo por Valoración: un Artista, un Álbum, o una Canción.
- Un Usuario solo puede tener una Valoración vigente por objetivo — una nueva valoración reemplaza a la anterior.
- Las estrellas van de 0.5 a 5, en pasos de 0.5.
- La "Valoración detallada" (1 a 100) es un **refinamiento opcional de las estrellas**, no una segunda nota: puede omitirse siempre y, si existe, debe caer dentro del rango de 10 puntos que corresponde a las estrellas (0.5★ → 1-10, 1★ → 11-20, 1.5★ → 21-30 ... 5★ → 91-100). Nunca pueden contradecirse entre sí.
- Se puede puntuar en cualquier orden: con solo el puntaje detallado, las estrellas se **derivan** (`⌈puntaje / 10⌉ / 2`: 86 → 4.5★). Las estrellas siempre se guardan, aunque la persona haya escrito primero el número.
- Una Valoración puede editarse; al editarla, ambas escalas se re-validan juntas.
- Borrar una Valoración es un borrado físico (`DELETE` real) — no hay historial ni recuperación. Ver ADR 0009.

## Comentarios

- Un Comentario pertenece a exactamente un objetivo: un Artista, un Álbum, o una Canción.
- A diferencia de la Valoración, un mismo Usuario puede dejar más de un Comentario sobre el mismo objetivo.
- Borrar un Comentario es un borrado físico (`DELETE` real) — no hay historial ni recuperación. Ver ADR 0009.

## Autenticación e identidades

- Un Usuario puede autenticarse con contraseña local o mediante una o más identidades externas.
- Las identidades externas se identifican por proveedor e identificador estable del proveedor; para
  OIDC, este identificador corresponde al `sub` asociado a un issuer concreto.
- El email compartido no vincula cuentas automáticamente.
- Toda autenticación local o externa termina en una sesión server-side común. Ratings y comentarios
  no distinguen el método de inicio de sesión.
- La vinculación de una identidad externa con un Usuario existente es una operación explícita y
  requiere una sesión autenticada y un flujo OAuth/OIDC válido.
- Las mutaciones de usuario resuelven el Usuario desde la sesión; nunca aceptan `user_id` desde el
  cliente.
- Los secretos OAuth solo viven en el servidor y no se persisten tokens del proveedor si no son
  necesarios para consumir su API.

## Roles, moderación y suspensión social

- Los roles de plataforma son acumulables: `moderator`, `admin` y `editorial_curator`. La ausencia
  de roles representa al usuario común.
- La autorización se aplica en backend mediante permisos derivados del rol; ocultar controles en la
  interfaz no constituye una protección.
- Un moderador puede ocultar/restaurar contenido social y aplicar una restricción temporal
  `social_activity`, pero no administrar credenciales, identidades, email, username, roles ni cuentas.
- Un curador editorial (`editorial_curator`, permiso `editorial.author`) crea, edita y propone listas
  editoriales en borrador; no puede publicarlas ni retirarlas. Publicar y retirar requiere
  `editorial.publish` (administrador). La autoría de la persona no reemplaza la identidad pública
  `@exploracion`.
- Una suspensión social bloquea nuevas acciones públicas o sociales, pero conserva login, lectura,
  perfil propio, diario privado y colección.
- Una suspensión social no borra ni oculta automáticamente el contenido anterior. Ocultar contenido
  existente requiere una acción de moderación separada y auditable.

## Datos y licencias

- El catálogo se completa bajo demanda (patrón de cacheo): no se precarga el catálogo musical completo desde el día uno.
- Las carátulas se muestran siempre en baja resolución, con fines de identificación del contenido, no como elemento decorativo a resolución completa — ver `03-data/data-licensing.md` para el detalle legal.

## Premios

- Los premios se curan a mano en `data/awards/` y se cargan con un script; la base no es su fuente de verdad (ADR 0032).
- Una categoría con cobertura "solo ganador" no tiene nominados no ganadores, y la interfaz lo declara en vez de mostrar
  una lista parcial como si fuera completa.
- Toda categoría de una ceremonia cerrada tiene al menos un ganador; puede tener más de uno (empates).
- Una categoría con cobertura "completa" tiene al menos tres nominados: menos es casi siempre una carga a medias, y la
  validación lo rechaza.
- Las categorías tienen un **nivel** que fija el orden de presentación: campo general (las grandes, Productor y
  Compositor del año), por álbum ("Mejor álbum de …") y por género (interpretaciones, canciones y grabaciones). El nivel
  por género se agrupa por **campo** (pop, dance y electrónica, rock y alternativa, R&B, rap, country) y exige declararlo.
- Productor y Compositor del año premian a una persona: su sujeto es el artista del catálogo y la nominación enlaza a
  su perfil.
- No se cubren todas las categorías del premio: solo las transversales, los álbumes de los campos principales y las
  interpretaciones, canciones y grabaciones de pop, dance/electrónica, rock/metal/alternativa, R&B, rap y country. Quedan
  fuera las técnicas, las de otros formatos y las de nicho (criterio en `05-features/awards.md`).
- El sujeto de una nominación coincide con el tipo que premia su categoría (álbum, grabación o artista). Una nominación
  sin sujeto identificado se publica igual, como texto.
- La carga nunca consulta MusicBrainz: la identificación (MBID) se hace antes, con un script que deja los casos
  ambiguos para el curador en vez de elegir.
- El nombre del premio se usa solo para describir: sin logos, imágenes de trofeos ni nada que sugiera afiliación.
- Un **salón de la fama** incorpora una clase por año, no entrega ganadores entre nominados (ADR 0044): sus clases no tienen número de
  edición, su fecha puede ser del año anterior al de la clase y solo se cargan clases cerradas (con la gala ya celebrada o, si no
  hubo, el anuncio ya hecho).
- Una incorporación a un salón de la fama no es un premio ganado: no cuenta en las tarjetas de premios, los ganadores recientes, los
  más premiados ni el orden del catálogo.

## Internacionalización

- Los datos del catálogo musical (nombres de artistas, títulos de álbumes, títulos de canciones, biografías) **no se traducen**. Se muestran tal cual llegan de MusicBrainz, independientemente del idioma activo de la interfaz.
- Los **nombres de los géneros** son datos del catálogo con una etiqueta por idioma que ya existe en
  la fuente, no una traducción automática: en español, la etiqueta de Wikidata del género (o una
  corrección editorial versionada cuando Wikidata enlaza otro concepto); si no hay, el nombre de
  MusicBrainz. En inglés, el nombre de MusicBrainz. Mismo criterio que los textos por idioma del
  perfil de artista (ADR 0021). Los nombres de las **familias** son vocabulario propio de la
  interfaz y sí se traducen.
- Los **nombres de las categorías de premios** se traducen (es/en) porque en español se conocen por su nombre
  traducido ("Álbum del año"); son datos curados con su nombre en cada idioma, no una traducción automática. Los
  títulos y artistas nominados no se traducen (ADR 0032).
- La internacionalización (i18n) aplica únicamente al _chrome_ de la interfaz: etiquetas de UI, botones, mensajes de error, estados de carga, y demás texto no proveniente del dominio musical.
- Ver `02-architecture/i18n.md` para la arquitectura completa del sistema de idiomas.

## Presencia y actividad social (Fase 5)

- Registrar una escucha no obliga a valorar, comentar ni compartir. La escucha usa reacción
  emocional (`liked`/`loved`/`obsessed`/`neutral`/`disliked`), nunca estrellas; ninguna entrada
  del diario crea, modifica ni propone la valoración vigente del objetivo.
- El día y el mes calendario de una escucha se cuentan en la **zona horaria del usuario**: el
  encabezado de mes del diario, su filtro de fecha y la lista de meses disponibles usan la misma
  zona, así que una escucha nunca aparece bajo un mes y se filtra en otro. Sin zona conocida, UTC.
  El diario sigue sin mostrar conteos por mes, totales ni rachas.
- Un Favorito es una marca independiente: marcarlo o quitarlo no crea ni modifica escuchas,
  valoraciones ni comentarios del mismo objetivo. Un usuario tiene a lo sumo un favorito por
  objetivo (toggle idempotente).
- Una Lista es de un solo tipo de entidad (solo artistas, solo álbumes o solo canciones) y su
  `entityType` no es modificable después de crearla. Un mismo objetivo aparece a lo sumo una
  vez por lista.
- Escucha, favorito, valoración, comentario y lista tienen audiencia propia
  (`private`/`followers`/`public`), independiente entre sí; el usuario puede cambiar la
  audiencia después de publicar.
- Un perfil privado no revela contenido no autorizado: las superficies ajenas devuelven lista
  vacía (o `404` en el detalle) sin indicar si el usuario tiene contenido.

## Notificaciones (Fases 1 y 2, `add-notifications-core` y `add-notification-milestones-and-releases`)

- Toda notificación nace de **un único servicio de emisión**, dentro de la **misma transacción** que la acción que la
  provoca (o, para lanzamientos, de la sincronización del calendario). Nunca se notifica a alguien por su propia acción,
  nunca se emite si hay un bloqueo en cualquier dirección entre actor y destinatario, y no se duplica un aviso por el
  mismo objeto y tipo.
- Tipos y destinatarios de la Fase 1: `comment_reply` (autor del tema respondido), `thread_reply` (autores previos de
  respuestas visibles del hilo, sin el autor de la raíz ni quien responde), `new_follower` (el seguido de un perfil
  público), `follow_request` (el dueño de un perfil privado), `follow_accepted` (quien pidió) y `moderation` (autor o
  dueño del contenido oculto/restaurado, o persona suspendida/revocada).
- **Hitos** (`comment_like_milestone`, `list_save_milestone`): avisan al autor de un comentario o al dueño de una lista
  cuando el objeto llega a una cifra redonda de me gusta o de personas que lo guardaron. No tienen actor y nunca dicen
  quién dio el like o guardó. Escalas: likes `10, 25, 50, 100, 500, 1000, 2500, 5000, 10000` y luego cada `10000`;
  guardados `1, 5, 10, 25, 50, 100, 500, 1000` y luego cada `1000`. Solo se avisa el **hito que cruza** el like o el
  guardado nuevo, una sola vez: un hito ya pasado sin aviso no se avisa con retraso. El hito se escribe con el like o el guardado **nuevo** (un re-like no cuenta),
  el conteo excluye cuentas desactivadas, un unlike **no retira** el aviso y volver a dar like no lo repite.
- **Lanzamientos** (`artist_release`, `artist_release_announced`, `artist_single`): avisan a quien sigue a un artista
  acreditado como **principal** en un disco del calendario de Inicio. Álbum o EP de los últimos **14 días** →
  `artist_release`; álbum o EP con fecha futura → `artist_release_announced` (un sencillo por salir no se anuncia); sencillo de los últimos 14 días →
  `artist_single`. El fan-out es un `INSERT … SELECT` idempotente por persona, disco y tipo. Una reedición o un tipo
  secundario no genera aviso. Los sencillos solo se verifican y vinculan si alguien con `artist_single` activo sigue al
  artista, y **no** entran al calendario ni al riel de Inicio.
- La notificación **desaparece con su objeto**: borrar la respuesta, el comentario, la lista, el disco, dejar de seguir,
  quitar un seguidor, rechazar o cancelar una solicitud, bloquear (que borra los seguimientos) o eliminar la cuenta. No
  hay limpieza manual.
- En la lectura se excluye a los actores con cuenta desactivada, cualquier bloqueo entre las partes, las respuestas
  ocultas o de raíz oculta, un hito cuyo comentario o lista dejó de ser visible, y un lanzamiento de un disco retirado
  de la discografía. Los avisos de moderación son la excepción: se muestran aunque el contenido esté oculto y **nunca
  nombran al moderador**, solo la acción, el objeto y el motivo.
- Se agrupan por hilo las respuestas del mismo tema y por día (en la zona del lector) los nuevos seguidores; los hitos
  se agrupan por objeto y muestran la cifra más alta; los lanzamientos, por disco. Las solicitudes, las aceptaciones y
  la moderación no se agrupan. El orden es por el evento más reciente.
- **Dos pestañas**: "Para ti" (Fase 1 e hitos) y "Novedades" (lanzamientos). El contador de la campana cuenta solo
  "Para ti"; "Novedades" lleva un **punto sin cifra**. Abrir cada pestaña mueve su propia marca de visto
  (`notifications_seen_at` / `notifications_releases_seen_at`), y una no apaga la otra.
- **Visto no es leído**: el contador cuenta entradas no leídas posteriores a la última apertura de la pestaña, se
  muestra con tope "9+" y vuelve a cero al abrir la campana o la página. Cada entrada sigue sin leer hasta que se abre
  su destino o se marca todas como leídas. El contador es una bandeja de entrada, nunca un logro: sin sonido, avisos
  emergentes, contador en el título de la pestaña, email ni push en esta fase.
- Preferencias: las nueve claves desactivables (`comment_reply`, `thread_reply`, `new_follower`, `follow_accepted`,
  `comment_like_milestone`, `list_save_milestone`, `artist_release`, `artist_release_announced`, `artist_single`) usan
  el **defecto del tipo** cuando no hay fila. Activados por defecto: los cuatro de la Fase 1, `comment_like_milestone` y
  `artist_release`. Desactivados por defecto: `list_save_milestone`, `artist_release_announced` y `artist_single`.
  `follow_request` y `moderation` son fijas. Una preferencia aplica a los avisos posteriores y no borra los existentes.
- Retención: se borran las notificaciones leídas con más de 90 días y cualquier notificación con más de 180, en el
  propio camino de lectura.

## Popularidad (Explorar)

Cambio `explore-popular-now` (2026-10, ADR 0041). "Popular" se mide en **personas distintas**, no en acciones, y es la misma regla
para "Popular ahora", el orden "Populares" de los listados y la colección "Lo más popular del mes".

- Por cada objetivo (álbum, artista, canción), cada persona aporta la suma de los pesos de los **tipos** de gesto distintos que hizo
  sobre él, **con un tope de 4**. Diez escuchas de una persona valen 1.
- Pesos: favorito **3**; reseña **2**; seguir al artista **2**; escucha del diario, valoración, añadir a una lista y tener en la
  colección **1**; pendiente por escuchar y "en búsqueda" **0,5**.
- Las estrellas no cuentan por su nota: popular no es bien valorado (eso es "Mejor valorados").
- Un artista suma sus gestos directos y los de sus discos, atribuidos al primer artista acreditado del disco.
- Solo cuentan cuentas activas. No cuenta nada marcado como privado (escuchas, favoritos, colección, "en búsqueda", listas privadas)
  ni las reseñas ocultas por moderación. Nunca se muestra quién.
- La cifra "N personas" solo se muestra desde **5**.
- "Ahora" son 30 días; con pocos datos la ventana se agranda a 90 días y luego a "de siempre" (aceptando objetivos con una persona),
  y la interfaz dice qué ventana usó.

## Conversación de la semana (`/activity`)

Cambio `redesign-activity-page` (2026-10). Riel "Con más conversación esta semana" de la página Comunidad.

- Entra un álbum con al menos **2 personas distintas** que, en los últimos **7 días**, lo valoraron, lo comentaron (solo
  comentarios raíz: las respuestas no cuentan) o lo reseñaron. Una persona que hace varias cosas cuenta una vez.
- Mismas reglas de visibilidad que "Recientes": perfil público y cuenta activa. No cuenta el contenido oculto por
  moderación, y para cada lector se restan las personas con un bloqueo en cualquier dirección. Si así un álbum queda bajo el
  umbral, no aparece.
- Orden: más personas primero; a igualdad, la actividad más reciente. Tope de **5** álbumes. Si no hay suficientes, el riel
  muestra menos o ninguno: nunca se completa con otros álbumes.
- La cifra "N personas" se muestra solo desde **5**, como en Popularidad.

## Agregados de comunidad del álbum

Cambio `redesign-album-page` (2026-09). La cabecera del álbum muestra agregados de la
comunidad; los umbrales se aplican en el read-model (`album-community-shared.ts`), no en la
interfaz:

- **Media e histograma** de estrellas solo con **5 o más valoraciones**; con menos, solo la
  cantidad.
- **"Lo coleccionan" / "lo buscan"** cuentan **personas distintas** (no copias ni variantes),
  con entradas de cualquier audiencia y sin cuentas desactivadas. Entre 1 y 4 se muestra
  **"menos de 5"**: el total nunca permite identificar a nadie. La colección conserva la
  visibilidad de sus entradas individuales; la wishlist sigue sin superficie propia por
  `username` (sus altas solo llegan al feed de seguidos según la audiencia de cada entrada,
  `expand-feed-coverage`).
- **Pendiente** (want-to-listen) **no** se agrega: no tiene superficie pública.
- **Favorita de la comunidad** por pista: hasta 3 pistas del álbum con al menos 5 reacciones
  `loved`/`obsessed` en entradas de diario públicas. La tracklist no muestra medias de
  estrellas por pista (Modelo C: en una canción, lo primario es la reacción).
- **Listas**: listas públicas y visibles que contienen el álbum, con los mismos filtros que
  "Mostrar en listas".

## Agregados de comunidad del artista

Cambio `redesign-artist-page` (2026-09). La cabecera del artista muestra tres agregados, con
el mismo umbral que el álbum, aplicado en el read-model (`artist-community.ts`):

- **Oyentes**: personas distintas con al menos una escucha del artista o de un disco de su
  discografía propia (las apariciones en discos ajenos no suman).
- **Seguidores** y **favoritos**: personas distintas que siguen al artista o lo tienen como
  favorito. **Se levanta la restricción anterior de no mostrar el conteo de seguidores**
  (`artist-following`, "en esta fase"): la cifra aparece solo en el bloque de comunidad, nunca
  en el control de seguir.
- **Listas**: listas públicas y visibles que contienen al artista.
- Los tres conteos de personas incluyen cualquier audiencia, excluyen cuentas desactivadas y
  muestran **"menos de 5"** entre 1 y 4. No hay promedio de estrellas del artista (su opinión
  es una nota, no una valoración), ni conteo de Pendiente, ni **ningún agregado de
  recorridos** entre usuarios.
