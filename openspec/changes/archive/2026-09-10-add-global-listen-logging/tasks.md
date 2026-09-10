## 1. Modal de registro

- [x] 1.1 Nuevo `src/components/diary/RegisterListenDialog.tsx` (client): modal con `createPortal`, focus-trap `Tab`/`Shift+Tab`, `Escape` para cerrar, `body` scroll lock y retorno de foco al disparador (mismo patrón que `GetStartedModal`).
- [x] 1.2 Fase "buscar": input con debounce ~300 ms + `searchCatalog(query)` con `useEffect`/`useState` (sin react-query — el Header vive fuera de `<Providers>`), disparo con `query.length >= 2`, estados carga/vacío/error. Lista de candidatos: `songContext` como fila "canción" (si viene), luego álbumes, luego artistas; cada fila es un `<button>` que selecciona.
- [x] 1.3 Filas de resultado: carátula/monograma (`CoverThumb` / `LazyCoverImage`) + título + subtítulo + tipo.
- [x] 1.4 Fase "ampliar": al elegir, `createListenEntry({ type: kind, id })`; con la entrada creada, renderizar `ListenEntryForm` embebido. Manejo de error (incluye `401` → enlace a `/auth/login`).
- [x] 1.5 Fase "listo": confirmación con enlace a `/me/diary` y acción "registrar otra" (vuelve a la fase de búsqueda). Cerrar en cualquier fase no deshace la entrada creada.
- [x] 1.6 Nuevo `src/components/diary/RegisterListenButton.tsx` (client): disparador (estilo acción, con `+`) que controla `open` y monta el diálogo.

## 2. Header

- [x] 2.1 En `src/components/layout/Header.tsx`, montar `RegisterListenButton` en la barra general `md+` después de los enlaces de contenido, solo cuando hay `currentUser`.
- [x] 2.2 Montar el mismo control al final del bloque de barra general del panel móvil (solo con sesión).

## 3. i18n

- [x] 3.1 Claves en `messages/{es,en}/diary.json`: rótulo del control ("Registrar"), título del modal, texto "elegí qué querés registrar", placeholder del buscador, estados vacío/carga/error, confirmación + "ver diario" + "registrar otra", cerrar.

## 4. Pruebas

- [x] 4.1 `src/components/diary/RegisterListenDialog.test.tsx`: buscar → elegir un resultado → `createListenEntry` llamado con el target correcto → aparece `ListenEntryForm`; error `401` muestra enlace a login; `Escape` cierra.
- [x] 4.2 `src/components/layout/Header.test.tsx`: el control "Registrar" aparece con sesión y no sin ella, en la barra general y en el panel móvil.

## 5. Verificación

- [x] 5.1 `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` en verde.
- [x] 5.2 Verificación visual en navegador: abrir el modal desde el Header, buscar un álbum, registrarlo, ampliar; sin sesión el control no está; móvil a 375px sin overflow.
- [x] 5.3 `openspec validate add-global-listen-logging --type change --strict` en verde.
