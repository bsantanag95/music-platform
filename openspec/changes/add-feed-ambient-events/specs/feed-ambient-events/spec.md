## ADDED Requirements

### Requirement: Composición de eventos ambiente de la red

El sistema SHALL calcular, para un usuario autenticado, un resumen de los **eventos
ambiente** recientes de su red —seguidos con relación aceptada, excluidos los bloqueados en
cualquier dirección—. Los eventos ambiente corresponden al **tier 4** de la jerarquía de
intención: actividad derivada sin un acto expresivo. El cálculo SHALL ser bajo demanda, sin
tabla materializada, y SHALL memoizarse dentro del request.

**Fuentes.** SHALL considerar tres tipos de evento, dentro de una ventana reciente:

- **Seguir artista**: una persona empezó a seguir a un artista. No tiene audiencia propia;
  se trata como público implícito (mismo criterio que la sección de artistas seguidos del
  perfil).
- **Seguir usuario**: una persona empezó a seguir a otra con relación **aceptada**. El
  evento SHALL aparecer solo si el **objetivo del seguimiento** tiene perfil público, o el
  lector ya sigue al objetivo con relación aceptada; y el objetivo NO es el propio lector;
  y no hay bloqueo entre el lector y el objetivo. La fecha del evento SHALL ser la de
  aceptación de la relación.
- **Colección física**: una persona agregó un disco a su colección. Tiene audiencia propia;
  SHALL contar solo cuando la audiencia es `followers` o `public`.

**Exclusiones.** La actividad del **propio lector** NUNCA SHALL aparecer. Los eventos de
"dejar de seguir" o "quitar de la colección" NO SHALL generarse (solo altas).

**Agrupación.** Los eventos SHALL agruparse **por autor y por tipo**: una persona que
siguió a cinco artistas en la ventana produce **un** grupo, no cinco entradas. Cada grupo
SHALL exponer el autor, el recuento total de ítems, una **muestra acotada** de ítems
(nombres de artista, usernames o títulos de álbum, cada uno enlazable) ordenada por fecha
descendente, y la fecha del ítem más reciente. Los grupos SHALL ordenarse por fecha del
ítem más reciente descendente y limitarse a un máximo acotado. La ventana, el tamaño de la
muestra y el máximo de grupos SHALL ser constantes con nombre, calibrables sin cambio de
esta especificación.

**Independencia del listado cronológico.** Este cálculo NO SHALL alterar la composición, la
paginación, el filtrado ni la presentación del listado cronológico de actividad
(`activity-feed`); es una superficie separada.

#### Scenario: Una persona que siguió varios artistas produce un solo grupo

- **WHEN** una persona que el lector sigue con relación aceptada empezó a seguir a 4
  artistas dentro de la ventana
- **THEN** el resumen contiene un único grupo de tipo "seguir artista" para esa persona,
  con recuento 4 y una muestra acotada de nombres de artista

#### Scenario: Colección física respeta su audiencia

- **WHEN** una persona agrega un disco a su colección con audiencia `private`
- **THEN** ese evento no aparece en el resumen; si lo agrega con audiencia `followers` o
  `public`, sí aparece

#### Scenario: Seguir a un perfil público es visible

- **WHEN** una persona que el lector sigue empieza a seguir a un tercero con perfil público
- **THEN** el resumen incluye ese evento de "seguir usuario"

#### Scenario: Seguir a un perfil privado no seguido por el lector se omite

- **WHEN** una persona que el lector sigue empieza a seguir a un tercero con perfil privado
  con el que el lector no tiene relación de seguimiento aceptada
- **THEN** ese evento no aparece en el resumen

#### Scenario: El evento "te empezó a seguir" no aparece en el resumen

- **WHEN** una persona que el lector sigue empieza a seguir al propio lector
- **THEN** ese evento no aparece en el resumen (es materia de notificación, no de esta
  franja)

#### Scenario: La actividad ambiente del propio lector no aparece

- **WHEN** el propio lector sigue a un artista o agrega un disco a su colección
- **THEN** eso no aparece en su propio resumen de eventos ambiente

#### Scenario: Bloqueo excluye a la persona

- **WHEN** existe un bloqueo en cualquier dirección entre el lector y una persona
- **THEN** ningún evento ambiente de esa persona aparece en el resumen

#### Scenario: Fuera de la ventana

- **WHEN** el único evento ambiente de una persona ocurrió antes del inicio de la ventana
- **THEN** esa persona no produce ningún grupo

#### Scenario: Sin eventos ambiente

- **WHEN** ninguna persona de la red del lector tuvo eventos ambiente en la ventana
- **THEN** el cálculo devuelve un resumen vacío

### Requirement: Presentación de la franja de eventos ambiente

`/me/feed` SHALL mostrar los eventos ambiente como una **franja compacta al pie de la
página**, debajo del listado cronológico de actividad y visualmente de-enfatizada respecto
de él (encabezado menor, texto secundario, sin celda de carátula). La franja representa el
tratamiento "minimizado" del tier 4.

Cada grupo SHALL mostrarse como **una sola línea**: el autor enlazado a su perfil, un verbo
según el tipo de evento, y la muestra de ítems enlazados (nombres de artista, usernames o
títulos de álbum) con "y N más" cuando el recuento supera la muestra. La franja NUNCA SHALL
mostrar una línea por evento individual, ni carátulas grandes, ni un contador destacado, ni
insignias.

Cuando no hay ningún grupo, la franja NO SHALL renderizarse (sin encabezado ni hueco). El
listado cronológico SHALL permanecer sin cambios.

#### Scenario: Franja con grupos de tipos distintos

- **WHEN** el lector abre `/me/feed` y su red tuvo, en la ventana, follows de artista,
  follows de usuario y altas de colección
- **THEN** ve, al pie de la página, una franja con una línea por grupo (autor + verbo +
  muestra de ítems enlazados), debajo del listado cronológico

#### Scenario: Una línea por grupo, no por evento

- **WHEN** una persona siguió a 5 artistas en la ventana
- **THEN** la franja muestra una única línea para esa persona ("siguió a … y N más"), no
  cinco líneas

#### Scenario: Sin eventos ambiente no hay franja

- **WHEN** el resumen de eventos ambiente está vacío
- **THEN** no se renderiza ningún encabezado ni franja, y el listado cronológico ocupa el
  lugar habitual

#### Scenario: La franja no altera el listado cronológico

- **WHEN** la franja de eventos ambiente se muestra
- **THEN** el listado cronológico de `/me/feed` conserva su composición, su paginación
  incremental, sus filtros y su presentación por tier, sin ninguna fila de evento ambiente
  intercalada
