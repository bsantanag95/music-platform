## Why

La auditoría del 2026-11-17 (`mockups/owner-profile-2026-11/`) encontró que editar el propio perfil es difícil de seguir. La
Ficha de la franja de identidad no tiene lápiz: se edita desde el panel de la cabecera, lejos de donde se ve. Ese panel mide
2.135 px y reúne cinco editores (foto, datos, ficha, preguntas y enlaces) con cuatro botones «Guardar» y una foto que se sube
sola, así que no queda claro qué se guardó. Y un perfil nuevo no le dice al dueño qué le falta. Es la Fase 3 de la propuesta
**A · Cabecera del dueño** con la franja «por completar» de la propuesta C (Fases 1 y 2: `redesign-owner-profile-phase1`,
`redesign-owner-profile-phase2`).

## What Changes

- La Ficha de la franja de identidad tiene su propio lápiz en el modo edición. Su panel reúne «Me defino como», géneros,
  «Cómo escucho» y las preguntas del perfil, que es lo que la Ficha muestra.
- El lápiz de la cabecera abre un panel más corto: foto, datos de la persona (bio, pronombres, ubicación, zona horaria) y
  enlaces. La ficha y las preguntas salen de ese panel.
- Cada panel tiene un solo «Guardar» (con «Cancelar») al pie, que guarda todo lo que cambió en ese panel; los editores
  alojados ya no muestran su propio botón. La foto sigue aplicándose al elegirla o quitarla, con un aviso que lo dice.
- Con la Ficha vacía, el modo edición muestra su marco vacío con el lápiz, como los demás bloques.
- Mientras falte algo, el dueño ve bajo la cabecera una franja «Tu perfil · N de 7» con siete partes: Foto, Bio,
  Identidad musical, Ficha, Empieza por aquí, Preguntas y Enlaces. Lo completo lleva una marca; lo que falta abre su editor.
  La franja se puede ocultar y desaparece sola al completar las siete.
- Las pantallas de ajustes que usan los mismos editores siguen igual, con sus propios botones.

### Goals

- Que cada bloque se edite donde se ve, en un panel corto con un solo «Guardar».
- Que un perfil nuevo muestre qué falta y lleve directo a cada editor.

### Non-Goals

- Cambiar la audiencia de un elemento desde el perfil.
- Guardar la foto con el «Guardar» del panel: subir y quitar siguen siendo inmediatos.
- Invitaciones en las secciones vacías del cuerpo (ya tienen su acción para agregar desde la Fase 2).

## Capabilities

### New Capabilities

<!-- ninguna -->

### Modified Capabilities

- `profile-edit-mode`: la Ficha suma control de edición; la Placa deja de incluir ficha y preguntas; el panel tiene un solo
  «Guardar» al pie.
- `social-profiles`: franja «Tu perfil · N de 7» para el dueño.

## Impact

- `src/components/profiles/`: `EditorPanel` (pie con «Cancelar» y «Guardar»), `OwnerEditProvider` y `editor-host.ts`
  (registro de guardados por editor), los editores que aloja el panel (botón propio oculto dentro de él), `IdentityStrip`
  (Ficha editable y marco vacío), nuevo `ProfileCompletion` (franja).
- `src/app/[locale]/users/[username]/sections.tsx` y `page.tsx`: paneles de la cabecera y de la Ficha, franja.
- `messages/{es,en}/users.json`; `messages/{es,en}/legal.json` y `src/lib/info-pages.ts` (la preferencia de ocultar la
  franja vive en el almacenamiento local, que la Política de cookies describe).
- `docs/05-features/user-profile.md`.
- Sin migraciones ni cambios de API.
