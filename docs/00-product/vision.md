# Visión de producto — music-platform

## Filosofía

Letterboxd demostró que catalogar lo que consumes puede ser una experiencia adictiva y social, no una tarea administrativa. music-platform aplica esa misma filosofía a la música, pero sin copiar la estructura de datos de una app de streaming ni de un catálogo de discos tradicional: la unidad de valor no es "reproducir", es **registrar y opinar sobre lo que ya escuchaste**.

## Público objetivo

Oyentes activos que quieren llevar un registro curado y personal de su historial musical — no consumidores pasivos de una playlist algorítmica. Gente a la que le gusta discutir discografías, comparar ediciones, y que extraña poder ver qué está escuchando su círculo social en tiempo real (la experiencia que ofrecía el "qué estás escuchando" de MSN, que el streaming actual no replica).

## Diferenciación

- Frente a **RateYourMusic / Discogs**: esas plataformas son exhaustivas pero frías — catalogación sin la capa social ni el "encanto" de Letterboxd.
- Frente a **Spotify / Apple Music**: son plataformas de reproducción, no de opinión. Su capa social es mínima y no está pensada para el descubrimiento pasivo de lo que escuchan otros.
- La apuesta de music-platform: valoración e interacción en **tres niveles** (artista, álbum, canción), con un modelo de datos que respeta cómo realmente funciona la industria musical (colaboraciones, ediciones múltiples, re-grabaciones) en vez de forzar todo a "una canción, un disco, un artista".

## Principios del producto

- Una canción es una entidad única y acumula su valoración e historial sin importar en cuántos discos o ediciones aparezca.
- Las estrellas y la valoración detallada nunca pueden contradecirse entre sí — es una regla de datos, no solo de interfaz.
- El catálogo crece con el uso real de la comunidad, no se intenta precargar el catálogo musical completo desde el día uno.
- Las carátulas se muestran en baja resolución, respetando que son material con copyright de las disqueras, no activos de libre uso.

## Frente al volumen: no hace falta opinar sobre todo

A diferencia del cine, donde ver y registrar una película son casi el mismo evento, en música escuchar y opinar ocurren a ritmos completamente distintos: se pueden escuchar cientos de canciones en una semana sin que eso implique ninguna decisión consciente sobre ninguna de ellas. music-platform no trata esas dos cosas como la misma acción, y no exige que lo sean.

La premisa del producto es: no hace falta tener una opinión sobre todo lo que escuchaste — solo sobre lo que te dejó algo. Un usuario puede tener un perfil activo (presente, con historial visible para quien lo sigue) sin haber valorado nunca una sola canción, y eso es un uso completamente válido de la plataforma, no un uso a medias. Valorar, comentar o marcar como favorito son gestos ocasionales y deliberados, reservados para lo que el usuario decide que merece un lugar en su historia — nunca una tarea pendiente que el sistema le recuerda.

Esta premisa condiciona cualquier función futura del producto, no solo su diseño visual actual: ninguna mecánica de la plataforma debe generar sensación de deuda o backlog frente al propio historial de escucha. La escasez de valoraciones no es un problema a resolver — es lo que le da valor a cada una.

## Qué NO hará music-platform (para evitar feature creep)

- No será un reproductor de música ni una fuente de audio con licencias de streaming.
- No pretende reemplazar a Spotify/Apple Music como origen de la escucha — se integra con ellos, no compite con ellos.
- No permitirá subir archivos de audio con copyright de terceros.
- No introducirá recomendaciones algorítmicas agresivas tipo "para ti" en las primeras fases — el descubrimiento inicial es social (ver qué escuchan otros), no algorítmico.
- No implementará mecánicas de presión o gamificación basadas en completitud del historial (rachas de días valorando, contadores de "pendientes por calificar", medallas por volumen de catálogo cubierto).
