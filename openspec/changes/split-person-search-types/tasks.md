## 1. Criterios y lectura

- [x] 1.1 `filters.ts`: `artistType` acepta `group|solo|other`; `ARTIST_ROLES` sin `own`; `role` solo con `other`;
      `activeFrom`/`activeTo` ignorados con `other`; `isCatalogOnly` verdadero con `artistType=other`
- [x] 1.2 Lectura tolerante de `person` (sola, con `own`, con `member|producer|musician`) e ignorar `role=own`
- [x] 1.3 Pastillas: "Grupo" / "Solista" / "Otras personas"; quitar Otras personas quita `role`; `criteriaForTab` y
      búsquedas recientes con los tipos nuevos
- [x] 1.4 Pruebas de `filters.test.ts` para los valores nuevos, la lectura tolerante y las pastillas

## 2. Búsqueda

- [x] 2.1 `mb-query.ts`: `solo` → `type:person`; `other` nunca llega a MusicBrainz
- [x] 2.2 `local-match.ts`: `solo` y `other` filtran `type = person`
- [x] 2.3 `artists.ts` modo habitual: después de fusionar, descartar con una lectura por lote las personas con
      discografía explorada y ningún disco propio
- [x] 2.4 `catalog-fields.ts`: Solista exige disco propio; Otras personas sin rol = sin discos propios y con pertenencia
      o crédito de personal; con rol, la condición del rol
- [x] 2.5 `types.ts` / `schemas.ts` y el endpoint con los valores nuevos
- [x] 2.6 Pruebas en `artists.test.ts`, `catalog-fields.test.ts`, `mb-query` y la ruta

## 3. Interfaz y textos

- [x] 3.1 `AdvancedSearchForm.tsx`: opciones del Tipo con la ayuda de Otras personas; Rol solo con Otras personas; sin
      "Activo entre" con Otras personas; etiqueta del año
- [x] 3.2 Encabezado "N solistas" / "N personas"; `messages/{es,en}/catalog.json` (Solista, Otras personas, Músico
      invitado o de sesión, sin `own`) y `pnpm run i18n:client-messages`
- [x] 3.3 Pruebas del formulario, las pastillas y el encabezado

## 4. Documentación y verificación

- [x] 4.1 `docs/04-api/contracts.md` (`artistType`, `role`) y `docs/05-features/catalog-browsing.md`
- [x] 4.2 Medir en scratch Solista (modo habitual y catálogo) y Otras personas sin y con rol: ≤150 ms por página
- [x] 4.3 Verificar en el navegador: Madonna con Solista, un integrante con Otras personas, enlace antiguo `person&role=member`
- [x] 4.4 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
