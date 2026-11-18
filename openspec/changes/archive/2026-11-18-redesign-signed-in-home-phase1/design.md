## Context

El Inicio con sesión (`AuthenticatedHome`) es una columna de 768 px (`max-w-3xl`) con, en orden: `WelcomePanel` (saludo, «Última vez»
pequeña, `QuickLinks` en dos columnas), `EmailVerificationNotice variant="home"`, `YearInvitationCard`, `WelcomeLink`, `FeedPreview` u
`OnboardingPrompt`, `RecentSelfActivity`, `ResumeList`, comunidad + listas públicas, comentarios populares y lanzamientos. La portada sin
sesión ya pasó a un contenedor de ~1400 px con títulos de sección grandes, tarjetas, mosaico de colecciones y horario de lanzamientos
(`redesign-anon-home-phase1..3`), así que al iniciar sesión el sitio cambia de sistema visual.

La auditoría del 2026-11-17 (cuenta con uso y una cuenta de prueba creada y borrada en local) comparó tres direcciones con mockups
navegables en `mockups/home-signed-in-2026-11/` (A · Escritorio, B · Diario primero, C · Continuidad). Se eligió **C** con dos préstamos
de B —el campo «¿Qué escuchaste hoy?» y el estante «Lo último que escuchaste» antes de «De quienes sigues»— y la regla del feed de A
(sin scroll interno, eventos de poco valor agrupados). La composición final está en `mockups/home-signed-in-2026-11/propuesta.html`
(con `?estado=nueva` para la cuenta sin actividad). Decisiones tomadas con el usuario el mismo día:

1. **El campo sugiere en línea.** Escribir muestra álbumes y canciones bajo el campo; elegir uno abre el diálogo en Escucha con ese
   objetivo.
2. **El estante tiene solo escuchas** (Fase 2): los últimos objetivos distintos anotados como escucha; cada uno con tu valoración si
   existe, si no el contexto de la escucha.
3. **El estante reemplaza «Tu rastro reciente»** (Fase 2): el rastro completo sigue en el diario y en el perfil, y el Inicio se queda
   sin cajas con scroll interno.
4. **«Lo volví a escuchar» abre el diálogo** con el disco ya elegido y la persona confirma; no se registra con un toque.

## Plan en tres fases

| Fase | Cambio | Alcance |
| --- | --- | --- |
| 1 | `redesign-signed-in-home-phase1` (este) | Cabecera a lo ancho con el mosaico de fondo: saludo como antetítulo, «¿Qué escuchaste hoy?», campo de registro con sugerencias, accesos en mosaicos y «Última vez» grande con «Lo volví a escuchar». Cuenta sin actividad: bienvenida, dos enlaces en prosa y el aviso de email en la misma cabecera. Diálogo de acciones rápidas con objetivo inicial y confirmación. |
| 2 | `redesign-signed-in-home-phase2` | Cuerpo en el contenedor ancho con `HomeSectionHeading`. **«Lo último que escuchaste»**: estante de carátulas (6–8, riel horizontal en móvil) con tu valoración en forma compacta o el contexto de la escucha y fecha relativa, «Ver diario»; reemplaza `RecentSelfActivity`. **«De quienes sigues»** en tarjetas `ActivityCard` (la primera ancha), **sin scroll interno**, con «Ver más actividad» que agrega páginas debajo, y los eventos de poco valor de un mismo autor (listas para completar creadas, seguimientos) **agrupados en una línea** con enlace. Sin seguidos: en su lugar, la actividad reciente de la comunidad en tarjetas con la invitación a seguir gente en el encabezado. Se retira `ScrollablePreviewList` de Inicio y se reescribe el requisito de carga incremental. |
| 3 | `redesign-signed-in-home-phase3` | «Retoma una lista» (solo listas con al menos un elemento) junto a **lanzamientos como horario** con el selector «De tus artistas / Populares» (personal por defecto si hay); «Para seguir explorando» con `CollectionMosaic` (si `/explore` está habilitado); «Mejor valorados» para la cuenta sin actividad; «La comunidad» como en la portada (comentarios populares y listas públicas en panel, `PeopleCard`), **sin mostrar la actividad propia como de la comunidad**. Revisión final en 1440/1024/820/390. |

Cada fase se archiva, se fusiona y se publica antes de abrir la siguiente, como en los rediseños anteriores.

## Goals / Non-Goals

**Goals:**
- Anotar una escucha desde el primer viewport de Inicio en 1440, 1024, 820 y 390 px, sin pasar por el Header.
- Una cabecera que comparta el lenguaje de la portada pública (contenedor ancho, mosaico de fondo, titular grande).
- Una sola llamada a la acción para la cuenta nueva, en lugar de cuatro cajas apiladas.
- Sin peticiones nuevas de imágenes, sin dependencias nuevas, sin cambios de API ni de esquema.

**Non-Goals:**
- El cuerpo del Inicio con sesión (Fases 2 y 3): feed, rastro, listas, comunidad y lanzamientos quedan como están en esta fase.
- Registrar con un toque (decisión 4) o un estante de discos de arranque para la cuenta nueva («Lo escuché» del mockup B): ambos
  necesitan una decisión de producto sobre contexto y fecha por defecto.
- Cambios de tipografía o de tokens de color; cambios en el Header o en el diálogo abierto desde «+ Añadir».

## Decisions

### Cabecera: `SignedInHero` server component
`SignedInHero` reemplaza a `WelcomePanel`. Franja a sangre completa con `border-b`, el `wall.webp` de `src/lib/config/hero-covers.ts`
como fondo decorativo (`aria-hidden`, opacidad ~12 %, máscara lineal que lo deja ver solo a la derecha) y, dentro, el contenedor de
`max-w-[88rem]` con la misma rejilla y márgenes que el cuerpo de la portada. Dos columnas desde `lg` (texto + campo | tarjeta); una por
debajo, en el orden antetítulo, titular, campo, ayuda, accesos (fila con desplazamiento horizontal por debajo de `sm`) y tarjeta.
El titular visible «¿Qué escuchaste hoy?» pasa a ser el `<h1>` de la página y sustituye al `<h1 class="sr-only">` con el nombre de la
app (el título del documento ya lo da la metadata). El saludo reutiliza `Greeting` (hora del día en el cliente) como antetítulo en
`font-data`, con el nombre enlazado al perfil. *Alternativa descartada:* conservar el saludo como titular (C original); con el campo
debajo, dos titulares compiten y el saludo no es una acción.

No se precarga `wall.webp`: con sesión el elemento más grande del primer viewport es el titular, y la imagen ya está en caché larga para
quien pasó por la portada.

### Campo de registro: `HomeLogField` sobre `useTargetSearch`
Componente cliente nuevo con patrón combobox (`role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`; flechas,
`Enter` elige la opción activa, `Escape` cierra la lista y, con la lista cerrada, no hace nada), alto ~56 px, que reutiliza
`useTargetSearch` —la misma búsqueda en dos fases que el diálogo y el onboarding— con un selector Álbum | Canción (álbum por defecto;
artista no, porque se anota un disco o una canción). Las sugerencias se muestran en una lista flotante bajo el campo, con carátula,
título, subtítulo y año, los estados cargando / sin resultados / error de `useTargetSearch` y mínimo de dos letras. `Enter` sin una
opción activa no navega a `/search`: el campo no es un buscador del catálogo. Elegir una opción monta `QuickActionsDialog` con
`initialTarget` y la acción Escucha; al cerrarse, el foco vuelve al campo y el campo se vacía. *Alternativa descartada:* que el campo
solo abriera el diálogo de «+ Añadir» (más barato, pero escribir en la página no daría sugerencias y sería un botón disfrazado de
campo). *Alternativa descartada:* `HeaderSearch size="hero"`: navega a entidades y a `/search`, no elige objetivos.

### Diálogo con objetivo inicial y confirmación
`QuickActionsDialog` acepta `initialTarget?: PickTarget` (abre con la acción indicada —Escucha— y ese objetivo ya elegido) y
`confirmListen?: boolean`. `ListenPanel` acepta `confirm?: boolean`: con él, antes de crear muestra el objetivo (título y subtítulo) y
dos acciones, «Registrar escucha» (primaria, recibe el foco al abrir) y «Elegir otro» (vuelve al buscador); solo al confirmar ejecuta
`createListenEntry` y sigue el flujo de siempre (aviso de registrada, detalles plegados, «Registrar otra», «Ver diario»). Sin
`initialTarget`, el foco va al buscador como hoy. El campo de Inicio abre **sin** confirmación —elegir la sugerencia ya es la elección,
igual que en el diálogo—; «Lo volví a escuchar» abre **con** confirmación (decisión 4). *Alternativa descartada:* un diálogo nuevo solo
para Inicio; duplicaría el panel de escucha y sus detalles.

### «Última vez»: `LastTouchCard`
Usa la misma entrada que hoy (`lastTouch`, primera escucha, valoración, comentario o reseña del rastro propio), en grande: carátula de
180 px (104 px en móvil), antetítulo «Última vez · <fecha relativa>», título y artista, y la valoración propia en forma de fila
(`StarRatingValue`, estrellas + 1–100) cuando existe —si la entrada es una valoración, sus propios datos; si no, `getOwnRatingRow` sobre
el objetivo, una consulta en el render—. Acciones: «Lo volví a escuchar» (secundaria, cliente: monta el diálogo con confirmación) y «Ver»
(enlace a la entidad, rotulado según el tipo: disco, canción o artista). La tarjeta entera no es un enlace, porque contiene dos
acciones.

### Cuenta sin actividad
`lastTouch === null` define la variante: antetítulo «Te damos la bienvenida, @usuario», el mismo titular y campo, una línea que explica
que el Inicio se llena con lo que anota y con la gente que sigue, y dos enlaces en prosa: «buscar gente para seguir» (`/users`) y, solo
si `onboardingPending`, «completar tu perfil musical» (`/welcome`). A la derecha, desde `lg`, una cuadrícula decorativa de 8 carátulas
recortadas del mismo `wall.webp` (`aria-hidden`), sin texto ni enlaces. `WelcomeLink` deja de montarse en Inicio y la pista
`onboardingLogFirstListen` sale de `OnboardingPrompt`.

### Aviso de email en línea
`EmailVerificationNotice` gana `variant="inline"`: una línea dentro de la cabecera (bajo la ayuda o los enlaces) con el texto y la acción
de reenvío, con el mismo comportamiento y estados que la variante actual. Aplica a cualquier cuenta sin verificar, con o sin actividad.
La variante `home` queda sin uso y se elimina.

### Accesos rápidos en mosaicos
`QuickLinks` pasa a mosaicos (su único uso es la cabecera, así que no hace falta una prop de variante): cinco mosaicos en una fila (icono arriba, rótulo abajo, ~44 px de alto mínimo de toque), con los
mismos destinos (diario, favoritos, listas, colección, progreso). El requisito de `home` se corrige para nombrar esos cinco destinos (hoy
dice «buscador y usuarios», que ya no son accesos rápidos desde `redesign-home-authenticated`).

## Risks / Trade-offs

- [Elegir una sugerencia crea la escucha al instante; alguien puede elegir la fila equivocada] → Es el mismo flujo que el diálogo de
  «+ Añadir»; el panel muestra el título registrado y «Ver diario», donde se puede borrar. No se agrega deshacer en esta fase.
- [Una consulta más en el render (`getOwnRatingRow`)] → Una fila por índice único (usuario, objetivo); se omite si la entrada ya es una
  valoración.
- [El titular deja de ser el nombre de la app para lectores de pantalla] → El título del documento sigue siendo el de la app; el `<h1>`
  describe la página, como en la portada.
- [Los bloques de debajo siguen en 768 px hasta la Fase 2, con un salto de ancho entre cabecera y cuerpo] → Fase 2 inmediatamente
  después; mientras tanto el cuerpo queda centrado bajo la cabecera.

## Migration Plan

Sin migraciones ni cambios de API. Despliegue normal; para revertir basta con revertir el commit.

## Open Questions

- «Lo escuché» de un toque y discos de arranque para la cuenta nueva: quedan anotados en `docs/05-features/home.md` («Pendiente»).
