# Mis conciertos

Cambio `add-my-concerts` (capability `concert-log`), ADR 0056. Registro simple de los conciertos a los que fue una
persona, para enriquecer su perfil.

## Qué es

Un concierto registrado es **un recuerdo de la persona, no un concierto verificado**. Nadie valida que existió, no hay
una entidad de concierto compartida y no se muestran cifras de comunidad. Si en el futuro existe un sistema de
conciertos, cada registro podrá enlazarse a uno real de forma opcional, sin reescribir lo que escribió la persona
(ADR 0056).

## Datos de un registro

| Dato | Obligatorio | Notas |
|---|---|---|
| Artista | Sí | Del catálogo. Desde el panel del artista viene ya elegido; desde Mis conciertos se busca. |
| Fecha | El año | Mes y día opcionales: se guarda con la precisión que la persona recuerde. Real, desde 1900 y no futura. |
| País | No | Selector de países del perfil. |
| Ciudad, recinto, gira | No | Texto libre, hasta 100. |
| Enlace al setlist | No | Solo un setlist de setlist.fm (`setlist.fm/setlist/…`), pegado por la persona. Es la forma más precisa de identificar el concierto. No se lee nada de setlist.fm. |
| Nota | No | Hasta 140. |
| Audiencia | — | Al crear, la audiencia por defecto del usuario o `followers`; se cambia al editar. |

Un festival se registra como un registro por artista. El mismo artista puede tener varios registros, aun el mismo día.

## Superficies

- **Panel "Tu relación" del artista:** fila **En vivo** después de Colección. Sin registros, "Sin conciertos
  registrados"; con registros, "Lo viste N veces" (enlaza a Mis conciertos filtrada por el artista). "Registrar" abre el
  formulario con el artista elegido y la cifra se actualiza al guardar, sin recargar.
- **Mis conciertos** (`/me/concerts`, en el menú personal como "Conciertos"): totales (conciertos, artistas, países),
  grupos por año del más reciente al más antiguo (la fecha completa antes que la parcial del mismo período), y por fila
  artista, fecha, lugar, gira, nota, botón **Setlist** si hay enlace y la audiencia si no es pública. Menú por fila con
  Editar y Quitar (con confirmación). Botón "Registrar concierto" con buscador de artistas. `?artista=<id>` filtra por
  un artista. Hasta 500 registros.
- **Perfil:** riel **Conciertos** con los 6 últimos visibles y el total, y página `/users/<usuario>/concerts` de solo
  lectura. Misma visibilidad que la colección física. En el pie del perfil, el enlace "Todos los conciertos".
- **Ajustes:** los conciertos son el sexto tipo de la audiencia por defecto y de "Aplicar a lo existente".
- **Exportación de datos:** `library.concerts`, con todos los campos.

## Fuera de alcance (por ahora)

Entidad de concierto compartida, sugerencias o verificación, la API de setlist.fm, festivales con varios artistas en un
registro, feed de seguidos, Láminas, compartir, notificaciones y cifras de comunidad en la página del artista.
