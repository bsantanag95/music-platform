## 1. `SearchForm` — soporte de autoejecución

- [ ] 1.1 Extraer la lógica de `handleSubmit` de `SearchForm` a una función interna
      reutilizable (`runSearch(normalizedQuery)`) que reciba el valor ya normalizado.
- [ ] 1.2 Agregar prop opcional `initialQuery?: string` a `SearchForm`; inicializar el
      estado `query` con ese valor.
- [ ] 1.3 Agregar `useEffect` que, si `initialQuery` normalizado no está vacío, invoque
      `runSearch` una única vez al montar (guardar con un ref si ya se ejecutó, para no
      repetir en renders posteriores).
- [ ] 1.4 Tests: autoejecuta con `initialQuery` presente; no autoejecuta sin `initialQuery`
      ni con uno vacío/solo espacios; no repite la autoejecución en un re-render.

## 2. Página `/search` — leer `q` de la URL

- [ ] 2.1 Tipar `searchParams` como `Promise<{ q?: string }>` en
      `src/app/[locale]/(catalog)/search/page.tsx` (Next.js 15, Server Component async).
- [ ] 2.2 Pasar `initialQuery={q}` a `<SearchForm />`.

## 3. Componente `HeaderSearch`

- [ ] 3.1 Crear `src/components/layout/HeaderSearch.tsx` (Client Component): input +
      submit, sin label visible pero con `aria-label`/label accesible (reusar copy de
      `catalog.search.*` vía `useTranslations("catalog")`).
- [ ] 3.2 En submit: normalizar (trim), si vacío no hacer nada; si no, deshabilitar el
      input y llamar a `searchCatalog` (`@/lib/api/catalog`).
- [ ] 3.3 En éxito: `router.push('/artist/' + result.artist.id)` (usar `useRouter` de
      `@/i18n/navigation`, igual que `SearchForm`).
- [ ] 3.4 En fallo (`ApiError` con `ARTIST_NOT_FOUND` o cualquier otro error):
      `router.push('/search?q=' + encodeURIComponent(normalizedQuery))`.
- [ ] 3.5 Tests: envío con resultado navega a `/artist/<id>`; envío sin resultado navega a
      `/search?q=...`; error de red navega a `/search?q=...`; envío vacío no dispara
      ninguna solicitud ni navegación.

## 4. Integrar `HeaderSearch` en el Header

- [ ] 4.1 En `src/components/layout/Header.tsx`, reemplazar el `<Link href="/search">` de
      "Buscar" por `<HeaderSearch />`, como primer elemento del grupo izquierdo.
- [ ] 4.2 Actualizar `Header.test.tsx`: el test "muestra un enlace al buscador" deja de
      aplicar tal cual — reemplazar por una verificación de que `HeaderSearch` está
      presente (mock del componente o de `searchCatalog`/`useRouter` según hookeen).
- [x] 4.3 Revisar visualmente en mobile/desktop que el nuevo input no rompe el layout del
      Header (ver Risk en design.md). — Desktop OK; en mobile el Header ya desbordaba
      horizontalmente antes de este cambio (demasiados links), sin regresión nueva —
      fuera de alcance el rediseño responsive del Header (ver Risk en design.md).

## 5. Gatear el buscador del hero de Inicio

- [ ] 5.1 En `src/app/[locale]/page.tsx`, mover `<SearchForm />` dentro del bloque
      `{!user && (...)}` que ya envuelve el CTA de registro/login.
- [ ] 5.2 Actualizar `src/app/[locale]/page.test.tsx`: agregar/ajustar caso que confirme
      que `SearchForm` no aparece en el árbol cuando hay `user`, y sí cuando no lo hay.

## 6. Mensajes e i18n

- [x] 6.1 Agregar las claves necesarias del input compacto (si no alcanza con reusar
      `catalog.search.fieldLabel`/`placeholder`) en `messages/es/catalog.json` y
      `messages/en/catalog.json`. — No hizo falta: `HeaderSearch` reusa
      `catalog.search.fieldLabel`/`placeholder` tal cual, sin claves nuevas.
- [ ] 6.2 Si el link "Buscar" del Header tenía una clave propia en `common.json` que queda
      sin uso, confirmar que no rompe otros consumidores antes de tocarla (dejarla si hay
      duda razonable).

## 7. Documentación

- [ ] 7.1 Actualizar `docs/05-features/home.md`: nota técnica de que el buscador del hero
      queda acotado a visitantes sin sesión.
- [ ] 7.2 Si existe un doc de navegación/header en `docs/05-features/`, documentar el
      nuevo `HeaderSearch`; si no existe, no crear uno nuevo solo para esto (fuera de
      alcance).

## 8. Verificación

- [x] 8.1 `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` — todos en
      verde. (typecheck ✓, lint ✓, test 493/493 ✓, build ✓)
- [x] 8.2 Verificación manual en el navegador: búsqueda exitosa desde el Header en una
      página distinta de Inicio; búsqueda sin resultado desde el Header cae en
      `/search?q=...` con el estado vacío correcto; Inicio sin sesión muestra el buscador
      del hero; Inicio con sesión no lo muestra. — Verificado en los 4 escenarios.
