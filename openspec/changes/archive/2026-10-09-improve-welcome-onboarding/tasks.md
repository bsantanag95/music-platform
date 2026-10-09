## 1. Motor de búsqueda compartido

- [x] 1.1 Extraer las dos fases de `TargetPicker` a `quick-actions/use-target-search.ts` (`useTargetSearch`), con `category` opcional y `year`/`category` en el candidato
- [x] 1.2 `TargetPicker` usa el hook; las pruebas de `quick-actions` siguen verdes sin cambios
- [x] 1.3 Eliminar `onboarding/useCatalogSearch.ts`

## 2. Puertas

- [x] 2.1 `AlbumIdentityPicker`: búsqueda acotada a `studio`, artista · año · tipo en cada fila, texto limpio y foco al elegir, «Quitar {título}», contador `aria-live`
- [x] 2.2 `NowPlayingPicker`: todas las canciones registrables, año y tipo, lo registrado sale de los resultados con «Deshacer», guarda contra clics repetidos, ejemplo según el tipo
- [x] 2.3 `SearchStatus` (región `status` polite, error distinto de «Sin resultados») y carátulas decorativas ocultas a lectores de pantalla
- [x] 2.4 Pruebas de ambos pickers (acotado, año y tipo, foco, clic repetido, deshacer, error, ejemplo por tipo)

## 3. Móvil, aviso y texto

- [x] 3.1 Inputs de 16 px y áreas táctiles de 44 px (`SearchTypeToggle size="touch"`, «Saltar», botón principal, «Quitar», «Deshacer»)
- [x] 3.2 `EmailVerificationNotice` variante `welcome` compacta, con botón secundario
- [x] 3.3 `messages/{es,en}/onboarding.json`: nuevo encabezado, claves nuevas; voseo verbal → tuteo en `messages/es`

## 4. Documentación y verificación

- [x] 4.1 `docs/05-features/onboarding.md` actualizado
- [x] 4.2 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- [x] 4.3 Verificación en el navegador con un usuario nuevo (escritorio y 375 px): búsqueda, elegir, registrar, doble clic, deshacer; usuario de prueba borrado de scratch
- [x] 4.4 Pendiente aparte (no hecho aquí): ranking de `/api/catalog/search` para álbumes conocidos con muchos homónimos; aviso de audiencia del favorito sembrado; persistir la selección de la Puerta 1
