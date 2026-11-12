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
- **Mis conciertos** (`/me/concerts`, en el menú personal como "Conciertos"): "Registrar concierto" junto al título y debajo los totales (conciertos, artistas, países; sin las cifras en cero; `polish-my-concerts`),
  grupos por año del más reciente al más antiguo (la fecha completa antes que la parcial del mismo período), y por fila
  artista, fecha, lugar, gira, nota, botón **Setlist** si hay enlace y la audiencia si no es pública (Seguidores como ícono, Privado con su nombre); una fila sin lugar ofrece "Agregar lugar". Menú por fila con
  Editar y Quitar (con confirmación). Botón "Registrar concierto" con buscador de artistas. `?artista=<id>` filtra por
  un artista. Hasta 500 registros.
- **Perfil:** riel **Conciertos** con los 6 últimos visibles y el total, y página `/users/<usuario>/concerts` de solo
  lectura. Misma visibilidad que la colección física. En el pie del perfil, el enlace "Todos los conciertos".
- **Ajustes:** los conciertos son el sexto tipo de la audiencia por defecto y de "Aplicar a lo existente".
- **Exportación de datos:** `library.concerts`, con todos los campos.

## Conciertos compartidos (Fase 1, `add-shared-concerts-phase1`, ADR 0057)

- **Pestaña Conciertos** del artista (última, grupos y personas): sus conciertos de MusicBrainz (conciertos y festivales
  con fecha completa), traídos al abrirla. Próximos arriba y pasados por año, 50 por página. Cada fila: fecha, nombre,
  marca Festival, recinto y ciudad, cuántas personas estuvieron (umbral 5) y "Estuve ahí" en los pasados. Vacía: invita a
  registrar el concierto en Mis conciertos.
- **Página del concierto** (`/concert/<slug>`): fecha, recinto, cartel (principales, teloneros, invitados; enlazados si
  están en el catálogo), cuántas personas estuvieron, quiénes (según la audiencia de cada recuerdo) y "Estuve ahí".
- **"Estuve ahí"** crea el recuerdo con los datos del concierto (o enlaza uno propio del mismo artista y la misma fecha);
  después es tuyo. Quitarlo borra el recuerdo solo si nunca lo editaste. En Mis conciertos un recuerdo enlazado muestra
  "Ver concierto".

## Conciertos de la comunidad (Fase 2, `add-shared-concerts-phase2`, ADR 0058)

- **Agregar un concierto** (pestaña Conciertos, con sesión): primero la fecha exacta, el recinto, la ciudad y el país;
  con eso aparecen los conciertos del artista a ±1 día ("¿Es alguno de estos?", primero los de la misma ciudad) para
  decir "Estuve ahí" en vez de duplicar. Si no es ninguno: nombre opcional, más artistas del cartel y el setlist. Al
  crearlo se abre su página.
- **Compartir este concierto** (Mis conciertos, en el menú de un recuerdo sin enlazar con día exacto, ciudad y país):
  la misma creación con los datos del recuerdo y la fecha fija; ese recuerdo queda enlazado.
- **Por confirmar:** sección al final de la pestaña, solo con sesión, con "Faltan N confirmaciones" y "Estuve ahí". Su
  página tiene un aviso y no se indexa. Se confirma con 3 personas que cuentan o con el setlist del mismo artista y año.
- **Página:** "Registrado por @usuario" en uno de la comunidad confirmado, enlace al setlist si lo tiene, y "Reportar"
  (no ocurrió, duplicado, datos erróneos) con sesión. Uno fusionado redirige al que quedó.
- **Moderación:** los reportes de conciertos llegan a la consola (`/moderation`, filtro Concierto) con ocultar,
  restaurar y fusionar (por la dirección o el id del concierto que se queda).

## Giras, festivales y sugerencias (Fase 3, `add-shared-concerts-phase3`, ADR 0059)

- **¿Son estos tus conciertos?** (Mis conciertos, sin filtro): para cada recuerdo sin enlazar, hasta 3 conciertos del
  mismo artista con fecha compatible y la misma ciudad (obligatoria si la fecha no es exacta). "Enlazar" no cambia lo
  escrito; "No es este" lo descarta. Hasta 20 a la vez, con "y N más".
- **Desvincular del concierto** en el menú de un recuerdo enlazado: conserva el recuerdo.
- **Giras:** cada concierto nombra su gira ("Gira: …") con enlace a `/tour/<slug>`: sus fechas, sus artistas y en cuántas
  estuviste. "Estuve ahí" lleva la gira al recuerdo nuevo.
- **Festivales:** un día o escenario dice "Parte de <festival>"; la página del festival muestra su rango de fechas, sus
  días y escenarios por día (cada uno con "Estuve ahí") y el cartel reunido.
- **Agregar a MusicBrainz:** en un concierto de la comunidad confirmado, con sesión, abre el alta de eventos de
  MusicBrainz con nombre y fecha escritos.
- Pendiente: el país de los conciertos de MusicBrainz, avisos, ediciones de festivales.

## Fuera de alcance (por ahora)

Sugerencias de enlace (Fase 3), la API de setlist.fm, festivales con varios artistas en un
registro, feed de seguidos, Láminas, compartir, notificaciones y cifras de comunidad en la página del artista.
