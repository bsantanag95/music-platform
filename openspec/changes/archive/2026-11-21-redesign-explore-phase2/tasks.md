## 1. Colecciones en mosaico

- [x] 1.1 Mover `CollectionMosaic` (y su test) de `components/home/` a `components/discovery/`; actualizar los imports de Inicio
- [x] 1.2 `familyLabel` opcional en `CollectionMosaic`: sello `FAMILY_STAMP_CLASS` en cada tarjeta; Inicio sin cambios
- [x] 1.3 Portada de Explorar: sección `colecciones` con `SectionHeading` (descripción + «Ver todas») y `CollectionMosaic` en lugar de `CollectionRail`
- [x] 1.4 Tests: sello de familia presente con `familyLabel` y ausente sin él; la portada monta el mosaico con hasta 6

## 2. Popular: top de álbumes

- [x] 2.1 `PopularTop` (servidor): `ol role="list"`, número grande de contorno `aria-hidden` (n.º 1 en ámbar), carátula del mismo tamaño con margen fijo, título, artista y cifra desde 5; `md:grid-cols-4 lg:grid-cols-6`, fila táctil con `snap-x` debajo de `md`
- [x] 2.2 `PopularNow`: la pestaña Álbumes usa `PopularTop`; Artistas y Canciones siguen con `PopularChart`
- [x] 2.3 Tests: orden y posiciones, cifra solo desde 5, enlaces a la página del disco

## 3. Géneros: 6 en grande más índice

- [x] 3.1 `GenreFamilies` (servidor): 6 primeras principales como tarjetas grandes (`CoverMosaic` + velo + nombre; plana sin carátulas), resto de principales y luego secundarias en un índice en columnas sin cifras; índice omitido con ≤ 6 familias
- [x] 3.2 Mensajes `genresIndexLabel` y `genresDescription` (es/en)
- [x] 3.3 Tests: reparto 6 + resto con secundarias al final, ninguna cifra, enlaces `?familia=`, sin índice con pocas familias

## 4. Décadas: línea de tiempo e índice

- [x] 4.1 `DecadeTimeline` (servidor): línea de tiempo desde `lg` (marca, año en grande, mosaico 2×2, nombre localizado) e índice en dos columnas por debajo; de la más reciente a la más antigua
- [x] 4.2 Entrada «Antes de 1950» al final con un enlace de texto por década anterior, sin desplegar; omitida sin décadas anteriores
- [x] 4.3 Mensaje `beforeDecade` (es/en)
- [x] 4.4 Tests: orden, nombres localizados, entrada «Antes de 1950», década sin carátulas, ninguna cifra

## 5. Limpieza, documentación y verificación

- [x] 5.1 Borrar `MosaicGrid` y sus tests; retirar mensajes sin uso (`moreFamilies`, `fewerFamilies`, `earlierDecades`, `fewerDecades`) tras comprobar que nadie más los usa; actualizar `explore-collections-pages.test.tsx`
- [x] 5.2 `pnpm run i18n:client-messages`
- [x] 5.3 `docs/05-features/explore.md`: colecciones, Popular, géneros y décadas
- [x] 5.4 `pnpm run verify` y `pnpm run build`
- [x] 5.5 Verificación en el navegador a 1440, 1024, 820 y 390 px: mosaico de colecciones, top de álbumes sin desborde, 6 géneros + índice, línea de tiempo desde 1024 e índice debajo, alto de la página en el teléfono frente al de la Fase 1; Inicio sin cambios visibles
