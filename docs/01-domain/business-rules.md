# Reglas de negocio — music-platform

Reglas explícitas que gobiernan el comportamiento del producto, independientes de su implementación técnica (la implementación de cada una vive en `03-data/sql-model.md`).

## Identidad de artistas

- Una persona puede pertenecer a uno o más grupos, y puede tener además su propia carrera solista; ambas se muestran en el mismo perfil.
- Un grupo es en sí mismo un Artista, con perfil y discografía propios.
- "Various Artists" es un Artista especial reservado para álbumes compilatorios sin un artista principal único.

## Canciones y versiones

- Una Canción es un único registro de valoración/comentarios, sin importar en cuántas Ediciones o Álbumes aparezca.
- Un remaster de audio **no** genera una Canción nueva: se puntúa independiente de la calidad del remaster.
- Una re-grabación, un remix o una versión en vivo sí cuentan como una Canción nueva y distinta de la original.

## Álbumes y ediciones

- La valoración y los comentarios de un Álbum pertenecen al concepto general del álbum, no a cada Edición (original, japonesa, remaster de aniversario) por separado.
- El listado de canciones (Pistas) sí depende de la Edición concreta que se esté mostrando.
- Todo Álbum se clasifica en exactamente una categoría: de estudio, single/EP, compilado, o en vivo/misceláneo.

## Créditos de artista

- Un Crédito pertenece a exactamente un objetivo: un Álbum o una Canción, nunca ambos ni ninguno.
- Un mismo Artista no puede tener más de un Crédito sobre el mismo objetivo.
- El orden de aparición de los Créditos (quién va primero) determina cómo se muestra la atribución ("Mark Ronson feat. Bruno Mars", "Queen & David Bowie").

## Valoraciones

- Un Usuario puede valorar exactamente un objetivo por Valoración: un Artista, un Álbum, o una Canción.
- Un Usuario solo puede tener una Valoración vigente por objetivo — una nueva valoración reemplaza a la anterior.
- Las estrellas van de 0.5 a 5, en pasos de 0.5.
- La "Valoración detallada" (1 a 100) es opcional, pero si existe debe caer dentro del rango de 10 puntos que corresponde a las estrellas elegidas (0.5★ → 1-10, 1★ → 11-20, 1.5★ → 21-30 ... 5★ → 91-100). Nunca pueden contradecirse entre sí.
- Una Valoración puede editarse; al editarla, ambas escalas se re-validan juntas.

## Comentarios

- Un Comentario pertenece a exactamente un objetivo: un Artista, un Álbum, o una Canción.
- A diferencia de la Valoración, un mismo Usuario puede dejar más de un Comentario sobre el mismo objetivo.

## Datos y licencias

- El catálogo se completa bajo demanda (patrón de cacheo): no se precarga el catálogo musical completo desde el día uno.
- Las carátulas se muestran siempre en baja resolución, con fines de identificación del contenido, no como elemento decorativo a resolución completa — ver `03-data/data-licensing.md` para el detalle legal.
