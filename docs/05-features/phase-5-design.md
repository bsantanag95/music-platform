# Diseño maestro de Fase 5 — presencia y actividad social

**Fase:** 5 (roadmap).  
**Estado:** diseño maestro en definición; no habilita todavía cambios de schema ni código.  
**Documentos relacionados:** `00-product/vision.md`, `00-product/roadmap.md`,
`01-domain/domain-model.md`, `05-features/listening-diary-and-ratings.md`,
`05-features/lists-and-favorites.md` y `05-features/activity-feed.md`.

## 1. Objetivo de producto

La Fase 5 convierte el catálogo con interacción social en un espacio personal para registrar,
expresar y compartir experiencias musicales. La aplicación no debe tratar cada escucha como una
opinión obligatoria: registrar que algo sonó y decidir qué merece una reacción son acciones
distintas.

El foco de la fase es la interacción con sentido:

- registrar lo que se escuchó;
- dejar una impresión, una valoración o un comentario cuando algo lo merece;
- conservar un historial personal útil;
- descubrir música a través de personas, no de recomendaciones algorítmicas agresivas;
- controlar qué parte de la actividad se comparte.

La unidad principal de la experiencia pasa a ser la **actividad de una persona sobre el catálogo**,
sin reemplazar el catálogo ni el modelo vigente de ratings y comentarios.

## 2. Principios de experiencia

- Escuchar no obliga a valorar, comentar ni compartir.
- Registrar una escucha debe ser una acción rápida y de baja fricción.
- Rating, comentario y favorito son acciones independientes de una escucha.
- La publicación de una actividad es una decisión explícita del usuario.
- El feed debe priorizar opiniones, sensaciones y contexto por encima del volumen de actividad.
- La privacidad se entiende por actividad, no solo por perfil.
- El catálogo musical conserva los nombres y datos de MusicBrainz; solo se traducen textos de UI.
- Las experiencias deben funcionar en móvil y escritorio, con estados accesibles y localizados.
- No se introducen rachas, contadores de pendientes ni mecánicas de completitud.

## 3. Alcance funcional

La fase contempla las siguientes actividades y superficies:

- Escucha de un artista, álbum o canción.
- Historial personal de escuchas.
- Impresión breve asociada a una escucha.
- Rating independiente de la escucha.
- Comentario independiente de la escucha.
- Favorito sobre artista, álbum o canción.
- Listas personales de artistas, álbumes y canciones.
- Perfil de usuario y configuración de privacidad.
- Seguimiento unilateral entre usuarios.
- Feed de actividad de usuarios seguidos.
- Integración opcional con servicios de streaming como mejora posterior.

La fase no convierte la aplicación en un reproductor ni almacena audio.

## 4. Modelo de privacidad

### 4.1 Perfil

El usuario tendrá una configuración general de perfil:

- **Público:** el perfil puede ser encontrado y sus actividades usan una audiencia pública o de
  seguidores según la configuración de cada actividad.
- **Privado:** el perfil puede ser encontrado por nombre, pero seguirlo requiere aprobación.
  Sus actividades son privadas por defecto.

Un perfil privado no desaparece de la búsqueda de usuarios. La búsqueda muestra como mínimo el
nombre o username y la acción correspondiente: `Seguir`, `Solicitud enviada` o `Siguiendo`.

### 4.2 Actividad

Cada escucha, rating, comentario, favorito o lista tiene una audiencia propia:

- **Privada:** solo visible para su propietario.
- **Seguidores:** visible para seguidores aprobados.
- **Pública:** visible públicamente según las reglas de la superficie donde aparezca.

El perfil define el valor predeterminado, pero una actividad puede sobrescribirlo. El usuario puede
cambiar la audiencia posteriormente sin borrar la actividad.

La visibilidad de ratings, comentarios, favoritos, escuchas y listas es independiente. Por ejemplo,
una persona puede publicar una opinión sobre un álbum y mantener privado el registro de que lo
escuchó varias veces.

### 4.3 Automatización

El scrobbling automático no publica actividad por sí mismo. Requiere consentimiento explícito y una
configuración de audiencia definida por el usuario. La desconexión de un proveedor no debe borrar
el historial ya registrado, salvo que el usuario lo solicite.

### 4.4 Decisiones pendientes

Todavía se debe decidir:

- si el perfil nuevo es público o privado por defecto;
- si una actividad pública de un perfil privado aparece fuera del perfil, o solo a seguidores
  aprobados;
- si el usuario puede configurar un valor predeterminado distinto por tipo de actividad.

Estas decisiones no deben impedir modelar las tres audiencias desde el inicio.

## 5. Registro de escucha

El flujo principal comienza desde una página de artista, álbum o canción:

1. El usuario pulsa `Marcar como escuchado`.
2. La aplicación registra la escucha sin exigir más datos.
3. De forma opcional, el usuario añade una impresión breve.
4. De forma opcional, elige contexto y una reacción emocional para esa escucha.
5. El usuario elige la audiencia de la actividad.
6. La aplicación confirma el registro y ofrece continuar con la navegación.

El flujo rápido no abre automáticamente el formulario completo de rating ni exige comentario. La
reacción de una escucha (gramática de sensación: `liked`/`loved`/`obsessed`/`neutral`/`disliked`/
ausencia) es independiente de la valoración vigente y nunca la actualiza, ni automáticamente ni por
oferta de "actualizar mi valoración": no existe conversión entre sensación y nota numérica.

La entidad conceptual `listen_entry` es append-only: cada registro representa un momento distinto
y no reemplaza entradas anteriores sobre el mismo objetivo. Sus objetivos iniciales son artista,
álbum y canción. Cada entrada tiene una audiencia propia (`private`/`followers`/`public`, default
`followers`).

## 6. Rating, comentario y favorito

### Rating

- Se mantiene una sola valoración vigente por usuario y objetivo.
- Una nueva valoración reemplaza la anterior.
- La coherencia entre estrellas y valoración detallada sigue siendo obligatoria.
- Crear una escucha no crea ni modifica ratings.
- La escucha usa reacción emocional, no estrellas: ninguna entrada del diario puede iniciar ni
  proponer una actualización del rating.

### Comentario

- Puede existir sin una escucha asociada.
- Un usuario puede publicar varios comentarios sobre el mismo objetivo.
- Se puede editar o borrar únicamente el comentario propio.
- El borrado es físico e irreversible.
- La audiencia se configura independientemente de la escucha y del rating.

### Favorito

- Es una señal simple de interés, sin escala numérica.
- Se aplica a artista, álbum y canción.
- Puede quitarse.
- Tiene audiencia propia y no implica rating, comentario ni escucha.

## 7. Listas

Las listas forman parte del alcance inicial de Fase 5. Una lista es una colección curada por un
usuario y puede contener artistas, álbumes y canciones.

La primera versión debe contemplar:

- título y descripción opcional;
- orden manual de elementos;
- agregar y quitar elementos;
- visibilidad privada, para seguidores o pública;
- edición y borrado por el propietario;
- estados vacíos y confirmación para acciones destructivas.

Queda pendiente decidir si una lista puede mezclar los tres tipos de entidad. También queda
pendiente si puede ser colaborativa. Salvo decisión posterior, la primera versión será propiedad de
un único usuario.

## 8. Seguimiento y perfiles

El seguimiento es unilateral, similar a `seguir` en una red social.

- Seguir un perfil público es inmediato.
- Seguir un perfil privado crea una solicitud.
- El propietario puede aprobar o rechazar la solicitud.
- El usuario puede dejar de seguir.
- El propietario puede eliminar seguidores.
- La búsqueda de usuarios funciona para perfiles públicos y privados.

Los estados de UI mínimos son:

- `Seguir`;
- `Solicitud enviada`;
- `Siguiendo`;
- `Aprobar`;
- `Rechazar`;
- `Dejar de seguir`.

Bloqueo y reporte no forman todavía parte de una decisión cerrada. Deben resolverse antes de abrir
la funcionalidad social a usuarios reales, aunque podrían implementarse en un incremento de
seguridad separado.

## 9. Feed de actividad

El feed muestra actividades de usuarios seguidos que sean visibles para el lector:

- escuchas compartidas;
- ratings publicados;
- comentarios publicados;
- favoritos publicados;
- listas publicadas o actualizadas.

El feed no debe mostrar actividades privadas ni generar una publicación por cada evento técnico de
sincronización. Las actividades con texto, rating o contexto pueden recibir mayor jerarquía visual
que una escucha sin comentario, sin ocultar esta última si fue compartida.

La primera versión puede calcular el feed bajo demanda a partir de las tablas de actividades y del
grafo de seguimiento. No se materializa una tabla de eventos hasta que el volumen real lo justifique.

Quedan pendientes el orden exacto, la paginación, la deduplicación de eventos y las reglas de
actualización cuando una actividad cambia de audiencia.

## 10. Arquitectura de navegación y UI

### 10.1 Navegación autenticada

El shell autenticado debe ofrecer acceso a:

- inicio o feed;
- búsqueda global;
- mi perfil;
- diario;
- favoritos;
- listas;
- seguidores y seguidos;
- configuración.

En móvil no se deben convertir todas estas opciones en botones permanentes del header. La
navegación primaria debe ser reducida y el resto debe vivir en un menú de cuenta o navegación
secundaria.

### 10.2 Páginas existentes

Las páginas de artista, álbum y canción incorporarán acciones contextuales reutilizables:

- marcar como escuchado;
- marcar o quitar favorito;
- añadir a lista;
- valorar;
- comentar.

El contenido musical no debe quedar bloqueado por la carga o el error de una acción social. Cada
acción necesita estados de carga, éxito, error, sesión requerida y confirmación cuando corresponda.

### 10.3 Nuevas superficies

Se necesitarán, como mínimo:

- búsqueda de usuarios;
- perfil público o privado;
- configuración de privacidad;
- diario e historial;
- gestión de seguidores y solicitudes;
- favoritos;
- listas;
- feed.

Todas las rutas deben respetar el segmento `[locale]`, reutilizar los componentes de estado
existentes y resolver los textos mediante los catálogos de mensajes.

## 11. Accesibilidad, responsive y estados

Cada superficie debe especificar:

- estado inicial y vacío;
- carga sin bloquear el contenido principal;
- error recuperable y acción de reintento;
- confirmación de acciones destructivas;
- feedback perceptible por lectores de pantalla;
- foco visible y orden de teclado;
- controles con nombres accesibles;
- comportamiento en móvil, tablet y escritorio;
- mensajes equivalentes en español e inglés.

La audiencia de una actividad debe ser visible antes de confirmar la publicación. No se debe
comunicar privacidad únicamente mediante color o un icono sin etiqueta.

## 12. Métricas de éxito

Las métricas iniciales deben medir participación significativa, no completitud:

- porcentaje de usuarios que registra al menos una escucha;
- porcentaje de escuchas que incluyen una impresión, rating o comentario;
- porcentaje de actividades compartidas frente a actividades privadas;
- usuarios que siguen al menos a otra persona;
- usuarios que vuelven al diario o al feed;
- interacciones con actividades de otras personas;
- porcentaje de usuarios que cambia la audiencia después de publicar;
- retención de usuarios que registraron una primera escucha.

No se usará como métrica de éxito la cantidad de actividades públicas por usuario sin considerar su
calidad o interacción posterior.

## 13. Orden de implementación

La fase se dividirá en cambios verticales, cada uno con su propio OpenSpec:

1. **Privacidad y perfil:** modelo de audiencia, perfil público/privado y configuración.
2. **Seguimiento:** búsqueda de usuarios, seguir, solicitudes y aprobación.
3. **Presencia manual:** `listen_entry` para artista, álbum y canción.
4. **Diario:** historial propio y filtros básicos.
5. **Favoritos y listas:** señales curatoriales y colecciones personales.
6. **Feed:** composición, paginación y filtrado por seguimiento y audiencia.
7. **Scrobbling:** integración opcional con proveedores de streaming.

El orden puede ajustarse después de resolver las decisiones pendientes, pero no se recomienda
implementar diario, listas y feed en un único cambio.

## 14. Decisiones pendientes antes de los OpenSpec

- Default de privacidad para perfiles nuevos.
- Significado exacto de una actividad pública creada por un perfil privado.
- Configuración predeterminada por tipo de actividad.
- Listas mixtas o de un solo tipo de entidad.
- Listas colaborativas o propiedad individual únicamente.
- Bloqueo y reporte en la primera entrega social.
- Orden, paginación y deduplicación del feed.
- Comportamiento al cambiar la audiencia de una actividad ya publicada.
- Alcance y filtros del historial del diario.
- Reglas de privacidad y frecuencia del scrobbling automático.

Una vez resueltas estas decisiones, el primer OpenSpec debe cubrir privacidad, perfil y seguimiento,
o bien presencia manual si se decide priorizar el valor individual antes del grafo social.
