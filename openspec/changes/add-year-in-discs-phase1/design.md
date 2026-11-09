## Context

Primera fase de `add-year-in-discs`. Decisiones tomadas al abrirla (2026-11-07): derivada con curaduría (el sistema arma calendario y cifras; la persona
elige su Top 5 y oculta discos, en la Fase 2); marca por año como la de la discografía; el año en curso existe siempre, "hasta ahora"; tres fases.

Estado de partida:

- `listen_entry` guarda escuchas de un artista, un disco o una canción, con `listen_context` (`first_listen`, `relisten`, `rediscovery`), audiencia
  propia (nacen privadas) y `created_at`. El diario cuenta día y mes en la zona horaria de la persona, que llega del navegador (cookie `tz` →
  `timeZone` de next-intl; `tz` en la API). No hay una zona guardada por cuenta.
- La Lámina de discografía es derivada, sin editor; `discography_share` la abre a quien pueda ver el perfil (ADR 0053), con objetivo de compartir,
  imagen privada del dueño, gesto y dejar de compartir (`STOPPABLE_KINDS`).
- ADR 0049: lo que compone el sistema lleva hasta 4 carátulas. ADR 0053 subió a 10 solo para la discografía.

## Goals / Non-Goals

**Goals:**

- Un año legible de un vistazo: cuándo escuchaste qué, sin tener que armar nada.
- Que compartirlo sea un gesto explícito que dice qué se verá.
- Que todos vean los mismos meses que el dueño.

**Non-Goals:**

- Top 5 del año, ocultar discos y la imagen con el calendario completo (Fase 2). Diciembre y "Arma la tuya" (Fase 3).
- Canciones y artistas en el calendario: el calendario es de discos.

## Decisions

### 1. Qué cuenta

Las escuchas del dueño con `created_at` en ese año, contado en la zona de la persona (§3). El calendario es de **discos**: una escucha de un disco cuenta
ese disco; una escucha de una canción o de un artista cuenta en las cifras, no en el calendario. Por mes, los discos escuchados, sin repetir, ordenados por
cuántas veces se escucharon ese mes y después por la primera escucha.

Cifras:

- **Escuchas:** todas las del año.
- **Discos:** discos distintos del calendario.
- **Discos nuevos:** discos con una escucha `first_listen` en el año.
- **Artistas descubiertos:** artistas principales de los discos escuchados cuya primera escucha de la cuenta (de cualquier disco suyo, o del artista)
  cae en ese año. Es una cifra propia del diario: no mira ninguna otra fuente.

Nunca el texto de una escucha, su reacción ni una nota. Un año sin escuchas no existe (`404`).

### 2. Visibilidad y marca

`year_share (user_id, year, time_zone, created_at)`, PK `(user_id, year)`, `ON DELETE CASCADE`, `CHECK year BETWEEN 2000 AND 2100` y `time_zone` no
vacía. Sin marca, solo el dueño. Con la marca, quien pueda ver el perfil (perfil privado: sus seguidores aceptados), con bloqueo y cuenta desactivada como
siempre. La marca no cambia la audiencia de ninguna escucha: el año muestra discos y cifras, no escuchas. El gesto avisa antes: "Se verán los discos de todas
tus escuchas de este año, también las privadas, y tus cifras". Dejar de compartir borra la fila.

- **Por qué una marca y no las audiencias de cada escucha:** las escuchas nacen privadas; con sus audiencias, casi ningún año se vería. Es la misma
  decisión que la discografía, con el mismo aviso.

### 3. Zona horaria

El dueño ve su año en la zona de su navegador, como el diario. La marca guarda esa zona al crearse (validada con `Intl`), y cualquier otra lectura del año
compartido (visitante, imagen, metadatos) usa la zona guardada: los mismos meses que vio el dueño al compartir. Si el dueño vuelve a compartir desde otra
zona, se actualiza.

### 4. Rutas y entradas

`/users/<u>/year/<año>` (página). Sin API nueva de lectura: la página lee en el servidor, y la marca usa las rutas de lo propio de siempre
(`/api/me/share/year/<ref>`). Entradas: un enlace "Tu año en discos" en el
diario (el año que se está mirando) y "Tus años" en `/me/laminas`, con los años que tienen escuchas.

### 5. Compartir

Objetivo `year`, ref `<userId>.<año>`. Como anónimo, solo con la marca. Imagen en formatos `link` y `story` con el marco común en esta fase: título ("2026 en discos" o "2026 en
discos, hasta ahora"), firma, las cifras y hasta 4 carátulas, las de los discos más escuchados del año (ADR 0049; la Fase 2 decide el calendario completo).
`year` entra en `OWN_SHARE_KINDS` y en `STOPPABLE_KINDS`; la versión de la imagen depende de los datos, así cambia con escuchas nuevas.

### 6. Rendimiento

Una consulta agregada por año y dueño sobre `idx_listen_entry_user_created` (rango de `created_at` con `make_timestamptz` en la zona), más una para la
primera escucha de cada artista. Presupuesto: bajo 100 ms con 1.000 escuchas en el año.

## Risks / Trade-offs

- **[El aviso no se lee y se comparte algo privado]** → el gesto lo dice antes de confirmar, la marca es reversible y la Fase 2 permite ocultar discos.
- **[Zona guardada distinta a la actual del dueño]** → el dueño ve su zona; si comparte de nuevo, se actualiza. Es la regla del diario.
- **[Artistas descubiertos depende del diario]** → se dice así en la página ("según tu diario").

## Migration Plan

`0087` en scratch durante el cambio. En la BD real va después de `0079` a `0086`.

## Open Questions

Ninguna.
