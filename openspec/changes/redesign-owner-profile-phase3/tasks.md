## 1. Un solo «Guardar» por panel

- [x] 1.1 `editor-host.ts`: `registerSave(editorId, entry)`; hooks `useHostedSave` (editores con borrador) y `useHostSaves` (foto)
- [x] 1.2 Editores del dueño (identidad, ficha, preguntas, enlaces, Tarjeta de Identidad, «Empieza por aquí»; la Tarjeta aplica al instante y no registra): registran su guardado y ocultan su botón con anfitrión; sin anfitrión, igual que hoy
- [x] 1.3 `EditorPanel`: pie «Cancelar» / «Guardar» (deshabilitado sin cambios, «Guardando…»); `OwnerEditProvider.save` ejecuta los guardados con cambios, cierra y refresca si todos salen bien, queda abierto si alguno falla
- [x] 1.4 `OwnerAvatarEditor`: aviso «La foto se guarda al elegirla» dentro del panel
- [x] 1.5 Tests: panel con dos editores guarda ambos; error deja el panel abierto; ajustes conservan sus botones

## 2. Paneles por bloque y Ficha editable

- [x] 2.1 `sections.tsx`: panel de la cabecera (foto, datos, enlaces) y panel de la Ficha (ficha musical y preguntas), construidos una vez
- [x] 2.2 `IdentityStrip` con `fichaEdit`; Ficha envuelta en `EditableBlock` para el dueño; marco vacío en modo edición
- [x] 2.3 Tests: lápiz en la Ficha, contenido de cada panel, Ficha vacía en modo edición

## 3. Franja «Tu perfil · N de 7»

- [x] 3.1 Cálculo de las siete partes en el servidor desde los datos ya cargados
- [x] 3.2 `ProfileCompletion` (cliente): título, barra, lista con marcas y botones que abren el panel; «Ocultar» con `localStorage` leído tras montar; nada con 7 de 7
- [x] 3.3 `page.tsx`: montarla bajo la cabecera solo para el dueño, no en vista previa
- [x] 3.4 Tests: conteo, parte pendiente abre su panel, oculta tras «Ocultar», ausente con 7 de 7 y para visitantes

## 4. Textos, documentación y verificación

- [x] 4.1 `messages/{es,en}/users.json` (franja, pie del panel, aviso de la foto, nombre de la Ficha); `pnpm run i18n:client-messages`
- [x] 4.2 `messages/{es,en}/legal.json`: la preferencia de ocultar la franja en el párrafo de almacenamiento local; fecha en `src/lib/info-pages.ts`
- [x] 4.3 `docs/05-features/user-profile.md`: paneles por bloque y franja
- [x] 4.4 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 4.5 Navegador con la sesión del dueño a 1440 y 390 px: lápiz y panel de la Ficha, un solo «Guardar», franja y sus botones, «Ocultar», ausencia en «Ver como visitante» (sin guardar cambios reales salvo deshacerlos)
