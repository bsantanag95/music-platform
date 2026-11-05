## 1. Criterios y lectura

- [x] 1.1 `filters.ts`: claves nuevas (`activeFrom`, `activeTo`, `role`, `genre`, `award`, `awardWon`, `artistCountry`) en `SearchCriteria` y `CRITERIA_KEYS`; `CATALOG_ONLY_KEYS` y `isCatalogOnly(type, criteria)`; lectura tolerante (años 1900–2100 con intercambio, `role` solo con `artistType=person`, slugs de género y premio con forma válida, `awardWon` solo con `award`, países en mayúsculas sin repetir y con tope)
- [x] 1.2 `criteriaToParams`, `hasCriteria`, `criteriaForTab` (conserva `genre`, `award`, `awardWon` entre Artistas y Álbumes) y el conteo de criterios del envío fijo
- [x] 1.3 Tests de `filters.test.ts` para cada campo, la regla de `role` y `awardWon`, y el cambio de pestaña

## 2. Consultas del catálogo

- [x] 2.1 `catalog-fields.ts` (módulo nuevo; reutiliza los filtros exportados de `local-match.ts`): condiciones SQL de actividad (primer/último disco propio, hasta hoy si no consta separado, solo discografía explorada), rol (`own`, `member`, `producer`, `musician`), género con subgéneros (recorrido de `genre_relation`, efectivo en álbumes, semilla o disco propio en artistas), premios (álbum o grabación anclada; artista o sus discos y grabaciones como principal; `awardWon`) y país del artista en álbumes
- [x] 2.2 Lectura paginada solo del catálogo para artistas y álbumes: todos los criterios en SQL, orden estable, `LIMIT 25 OFFSET n` y cifra total
- [x] 2.3 Validar el género (slug visible) y el premio (slug cargado o `any`) contra la base; ignorar los desconocidos
- [x] 2.4 Tests de las condiciones (SQL generado y casos límite) y smoke contra la base de scratch: Javiera Mena fuera de "activa 1980–1990", un integrante sin discos fuera de `role=own`, subgéneros incluidos, ganadores de un premio — verificado con un script temporal contra scratch (no queda como smoke: solo lee y depende de los datos del catálogo)

## 3. Servicios y endpoint

- [x] 3.1 `searchArtists` y `searchAlbums`: con un campo del catálogo, la lectura paginada local sin MusicBrainz ni stubs, con `catalogOnly: true`; sin ellos, igual que hoy con `catalogOnly: false`
- [x] 3.2 `params.ts` y `/api/catalog/search`: parámetros nuevos, los campos del catálogo bastan sin `q`; esquema de respuesta con `catalogOnly`
- [x] 3.3 Lectura por lote de "Integrante de" (banda de más actividad y cuántas más) para los resultados de Artistas en los dos modos
- [x] 3.4 Tests de servicios y del endpoint (sin solicitudes a MusicBrainz, paginación sin repetidos, `catalogOnly`, `200` solo con `award=any`)

## 4. Formulario y página

- [x] 4.1 Grupo **Del catálogo** con su ayuda en Artistas (activo entre, género, premios) y Álbumes (género, país del artista, premios); Rol en Identidad, visible solo con Persona y limpiado al cambiar el tipo
- [x] 4.2 Etiqueta y ayuda del año según el tipo elegido, en el cliente
- [x] 4.3 Selector de un género con el buscador de géneros existente; selector de premios (cualquier premio o uno cargado) con "Solo ganadores"; `CountryMultiPicker` para el país del artista
- [x] 4.4 Aviso "Solo artistas/álbumes del catálogo" en el encabezado de resultados; "Cargar más" del modo solo catálogo
- [x] 4.5 Pastillas de la barra de criterios, "Sin <campo>" del estado vacío con su cifra, datos destacados (período, género, país del artista) y columna "Activo" en la vista Tabla
- [x] 4.6 "Integrante de" en las filas de Artistas (vista Lista; la Tabla no tiene columna para él), también en `/search`
- [x] 4.7 Mensajes es/en en `catalog.json` y `pnpm run i18n:client-messages`
- [x] 4.8 Tests de componentes (formulario, pastillas, aviso, etiqueta del año, integrante)

## 5. Documentación y cierre

- [x] 5.1 `docs/04-api/contracts.md` (parámetros nuevos, `catalogOnly`), `docs/05-features/catalog-browsing.md` (campos del catálogo y su cobertura), `docs/00-product/roadmap.md` (pendientes: sello, número de catálogo, formato vía búsqueda de releases; valoración)
- [x] 5.2 Medir en la base de scratch cada página solo del catálogo (≤ 150 ms de mediana) y verificar en el navegador una búsqueda por actividad, una por rol y una de álbumes por género y país — medianas de 9 a 155 ms por página; las páginas completas responden en 50–250 ms
- [x] 5.3 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
