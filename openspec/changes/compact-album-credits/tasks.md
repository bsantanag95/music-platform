## 1. Lectura

- [x] 1.1 `getAlbumPersonnel` devuelve `{ levels, leadKind }` (D1); actualizar `album-data.ts`, el layout y `credits/page.tsx`
- [x] 1.2 Test de `leadKind` (solista → `person`; banda o colaboración mixta → `group`)

## 2. Roles

- [x] 2.1 `formatRoles` con modificadores (D4): descartar `additional`/`guest` en instrumentos y voces, `solo` como matiz, etiquetas compuestas para otros tipos, deduplicación
- [x] 2.2 Traducciones faltantes en `messages/{es,en}/catalog.json` (membranophone, arranger, instrument arranger, tambourine, bell, clavinet, sitar, baritone saxophone, Wurlitzer, guitar family, producer_co/executive/additional, etc.)
- [x] 2.3 Tests de `formatRoles` con los casos reales observados

## 3. Pestaña Créditos

- [x] 3.1 Rótulo del primer nivel según `leadKind` (Artista principal / Artistas principales / Integrantes de la banda)
- [x] 3.2 Invitados y Producción en `<details>` abiertos con ≤ 6 personas; resumen con cantidad y tres nombres (D2)
- [x] 3.3 Filas compactas: 4 roles + "+N" desplegable, pistas en línea propia (D3)
- [x] 3.4 Tests de `AlbumCredits` (rótulo solista, nivel largo contraído con resumen, nivel corto abierto, "+N")

## 4. Documentación y verificación

- [x] 4.1 Actualizar `docs/05-features/catalog-browsing.md` (pestaña Créditos)
- [x] 4.2 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- [x] 4.3 Verificar en el navegador un álbum muy acreditado y uno de banda con pocos créditos
