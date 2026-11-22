## Context

El modo edición (spec `profile-edit-mode`) envuelve tres bloques en `EditableBlock`: la Placa de la cabecera, la Tarjeta de
Identidad y «Empieza por aquí». El lápiz llama a `openEditor` de `OwnerEditProvider`, que aloja el editor (construido en el
servidor con su `initial`) en `EditorPanel`. Los editores informan cambios sin guardar y guardados al anfitrión por
`EditorHostContext` (`useReportDirty`, `useNotifySaved`), y cada uno tiene su propio botón «Guardar». El panel de la Placa
hoy monta cinco: `OwnerAvatarEditor` (sube o quita al instante), `OwnerIdentityEditor`, `OwnerMusicIdentityEditor`,
`OwnerPromptsEditor` y `OwnerLinksEditor`. Los mismos editores se usan en `/me/settings/profile` sin anfitrión.

La Ficha (`ProfileFicha`, dentro de `IdentityStrip`) muestra roles, géneros, formatos y las preguntas del perfil, y no tiene
lápiz. `IdentityStrip` omite la Ficha si está vacía y toda la franja si no queda ninguna parte.

## Goals / Non-Goals

**Goals:** lápiz en la Ficha; paneles cortos por bloque con un solo «Guardar»; franja «Tu perfil · N de 7».

**Non-Goals:** cambiar audiencias desde el perfil; que la foto espere al «Guardar»; tocar las pantallas de ajustes.

## Decisions

### Paneles: cabecera y Ficha

- Panel de la cabecera («Placa»): `OwnerAvatarEditor`, `OwnerIdentityEditor`, `OwnerLinksEditor`.
- Panel de la Ficha: `OwnerMusicIdentityEditor` y `OwnerPromptsEditor`. Es lo que `ProfileFicha` muestra.
- La Tarjeta de Identidad y «Empieza por aquí» ya tienen un editor cada una; no cambian.

### Un solo «Guardar» al pie del panel

`EditorHostContext` suma `registerSave(editorId, { dirty, save })`, donde `save(): Promise<boolean>` es la función de
guardado que cada editor ya tiene. Los editores con borrador la registran con `useHostedSave`; con anfitrión no dibujan su
botón propio (ni su aviso «Guardado»); sin anfitrión (ajustes) se comportan como hoy. El pie solo aparece si algún editor
registró su guardado (la Tarjeta de Identidad aplica al instante y su panel no tiene pie).

`EditorPanel` recibe `onSave` y muestra al pie «Cancelar» y «Guardar» (amber, deshabilitado sin cambios, «Guardando…»
mientras corre). `OwnerEditProvider.save` ejecuta en orden los guardados de los editores con cambios; si todos devuelven
`true`, cierra el panel y refresca el perfil; si alguno falla, el panel queda abierto y cada editor muestra su error donde
ya lo muestra. «Cancelar» es el mismo cierre que `Escape` (pide confirmar el descarte si hay cambios).

Alternativa descartada: fusionar los editores en un formulario nuevo por panel. Duplicaría validaciones y llamadas a la API
que ya viven en cada editor, y las pantallas de ajustes los seguirían usando por separado.

### La foto

Subir o quitar la foto sigue siendo inmediato: es un archivo con su propia previsualización y no tiene un estado sin
guardar razonable. Dentro del panel, el editor de foto muestra una línea corta que lo dice («La foto se guarda al
elegirla») y su guardado cuenta para refrescar el perfil al cerrar.

### Ficha editable y vacía

`IdentityStrip` recibe `fichaEdit` (nombre y editor del panel) desde `sections.tsx` solo para el dueño, y envuelve la
Ficha en `EditableBlock`. Si la Ficha está vacía, para el dueño en modo edición se dibuja el marco vacío de
`EditableBlock` en su lugar (y la franja se dibuja aunque las otras partes también estén vacías). Fuera del modo edición
y para visitantes, el comportamiento es el de hoy.

### Franja «Tu perfil · N de 7»

Componente cliente `ProfileCompletion`, montado por `page.tsx` solo cuando `isOwn` y no en previsualización, entre la
cabecera y la franja de identidad. Recibe del servidor las siete partes con su estado:

| Parte | Completa cuando |
| --- | --- |
| Foto | hay `avatarUrl` |
| Bio | la bio no está vacía |
| Identidad musical | la Tarjeta de Identidad tiene al menos un elemento |
| Ficha | hay al menos un rol, género o formato |
| Empieza por aquí | hay al menos un elemento |
| Preguntas | hay al menos una pregunta respondida |
| Enlaces | hay al menos un enlace |

Muestra «Tu perfil · N de 7», una barra de progreso fina y la lista (en teléfono, solo lo pendiente): lo completo con una marca (no interactivo), lo que falta
como botón «+ Parte» que abre el panel del bloque correspondiente con `openEditor` (no exige activar el modo edición). Foto,
Bio y Enlaces abren el panel de la cabecera; Ficha y Preguntas, el de la Ficha. Por eso los editores de cada panel se
construyen una sola vez en el servidor y se pasan tanto al lápiz como a la franja.

Con las siete completas no se dibuja. «Ocultar» la esconde y lo recuerda en `localStorage` (`profile-completion-hidden`),
por dispositivo; se lee tras montar para no desajustar la hidratación (la franja aparece tras montar en lugar de
parpadear). No se guarda en la base: es una preferencia de vista como las demás que ya viven en el almacenamiento local, y
la Política de cookies la describe en ese mismo párrafo.

## Risks / Trade-offs

- Un guardado parcial (un editor guarda y el siguiente falla) deja persistido lo primero → el panel queda abierto con el
  error del que falló y el perfil se refresca al cerrar, porque hubo un guardado.
- La franja se basa en datos ya cargados por la página (perfil, tarjeta, «Empieza por aquí»): no suma consultas.
- Ocultar por dispositivo puede volver a mostrarla en otro → aceptable; desaparece sola al completar.
