## 1. Contenido visible

- [x] 1.1 `profileHasVisibleContent` en `src/services/profiles/visible-content.ts`: consultas de una fila en paralelo con la vista del visitante; devuelve solo un booleano
- [x] 1.2 Tests: falso sin nada; verdadero con cada fuente por separado (diario, reseñas, valoraciones destacadas, favoritos, listas, Caminos, colección, conciertos, En rotación, Empieza por aquí, huella, artistas seguidos, ficha)

## 2. Aviso y estado vacío

- [x] 2.1 `FollowersOnlyNote` (variantes `note` y `empty`) con la acción según quien mira: seguir, iniciar sesión (+ «Crear cuenta» en `empty`), inerte en previsualización, sin acción con solicitud recibida
- [x] 2.2 `FollowersNoteSection` en `sections.tsx` y su `<Suspense>` al final del cuerpo en `page.tsx`, solo para quien no es el dueño ni sigue
- [x] 2.3 Tests: componente por variante y estado; `page.test.tsx` (lo ven anónimo, sin relación y previsualización; no el dueño ni el seguidor)

## 3. Textos, documentación y verificación

- [x] 3.1 `users.followersNote.*` en `messages/{es,en}/users.json`; `pnpm run i18n:client-messages`
- [x] 3.2 `docs/05-features/user-profile.md`: aviso, estado vacío y la lista de fuentes del servicio
- [x] 3.3 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 3.4 Navegador a 1440 y 390 px sin sesión: `@besantanag95000` (aviso al final), `@bsantana` (estado vacío), un perfil con contenido público (aviso), sin desborde
