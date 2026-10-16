## Why

"Explorar por género" muestra en cada familia un número de álbumes y una barra de tamaño relativo. El número es el conteo de
todos los `release_group` que la base ha guardado con un género de esa familia: cuenta sencillos, recopilaciones y discos en
vivo (de los 17.317 de Rock solo 3.373 son álbumes de estudio) y crece a medida que alguien abre artistas nuevos y se
descarga su discografía. No mide el peso del género ni lo que la plataforma ofrece, y la barra solo repite esa cifra. La
sección es un punto de entrada para elegir un camino, no un tablero: pide imagen, no estadística.

## What Changes

- **Se quitan el número de álbumes y la barra de tamaño** de las tarjetas de familia.
- **Cada tarjeta se vuelve una pieza visual**: un mosaico de carátulas reales de esa familia (hasta cuatro, a sangre) con el
  nombre de la familia encima. Las carátulas son discos de estudio con carátula, elegidos por la señal de calidad que ya usan
  las colecciones (premios y calendario cuando la comunidad aún no opina) y estables entre visitas.
- Una familia sin carátulas disponibles se muestra como tarjeta plana con su nombre, sin hueco ni imagen rota.
- El conteo sigue sirviendo, solo internamente, para omitir las familias sin álbumes.
- Las carátulas por familia se calculan una vez y se reutilizan unas horas (la consulta tarda cerca de un segundo en frío y
  la portada no puede pagarla en cada visita).

Fuera de alcance:

- El listado que se abre al elegir una familia (`/explore?familia=`) y su orden.
- La página de un género y las familias que existen o su orden.
- Un orden o una selección editorial de carátulas por familia (si más adelante se quiere elegir la imagen a mano, es otro
  cambio).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `album-discovery`: las tarjetas de familia de género dejan de mostrar número de álbumes y barra y pasan a ser un mosaico
  de carátulas con el nombre.

## Impact

- `src/components/discovery/FamilyGrid.tsx` (tarjeta nueva y sin barra) y su prueba.
- `src/services/discovery/discovery.ts`: lectura de carátulas por familia con caché en memoria; `ExplorePage.families` pasa a
  llevar las carátulas.
- `src/app/[locale]/(catalog)/explore/page.tsx` (deja de formatear el conteo) y mensajes `catalog.json` (es/en): se retira
  `albumCount` si ya no lo usa nada.
- Docs: `docs/05-features/explore.md`. Sin migraciones ni cambios de API.
