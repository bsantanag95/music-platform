## Context

`next-intl` 4 sirve los textos al cliente a través de `NextIntlClientProvider`. El layout raíz le pasaba el objeto
completo de `getMessages()` (21 namespaces, ~162 KB en `es`). Hay ~330 módulos `"use client"`, ~280 usan
`useTranslations`, y la mayoría pide un namespace grande (`users` ~41 KB, `catalog` ~55 KB) para leer unas pocas
claves. Las pruebas de componentes cargan los mensajes completos con `renderWithIntl`, así que una clave que falte en
el cliente no la detecta ninguna prueba existente.

## Goals / Non-Goals

Ver `proposal.md`.

## Decisions

### D1. Claves a nivel de hoja, calculadas sobre el código, no listas a mano

Elegir namespaces enteros por página ahorra poco (casi todo cliente toca `users`, `catalog` o `errors`) y listas
escritas a mano se desactualizan en silencio. Un análisis sobre el programa de TypeScript recorre los imports de cada
archivo de ruta, marca como cliente lo que está bajo un `"use client"` y resuelve, con el checker:

- `const t = useTranslations("ns")` y cada `t("k")`, `t.rich/markup/raw/has("k")` → `ns.k`;
- una clave por variable con tipo de unión de literales → una ruta por literal;
- una clave dinámica → su prefijo estático (`` `kinds.${k}` `` → `ns.kinds`; `` `empty${v}` `` → `ns.empty*`, las
  hermanas que empiezan así);
- una `t` que se pasa a una función o componente del proyecto (`fn(t)`, `<Fila t={t} />`) se sigue en el parámetro;
  un array de dependencias de un hook no cuenta como uso;
- cualquier otro uso (o `useMessages()`, o un namespace no literal) → el namespace entero (o todo).

Alternativa descartada: `useMessages`/`pick` manual por área, como sugiere la documentación de next-intl. Exige
mantener listas a mano y no detecta una clave nueva.

### D2. Un proveedor por archivo de ruta, envolviendo el componente entero

`withClientMessages("me/feed/page", FeedPage)` como `export default`: envuelve todo lo que renderiza la ruta, con
cualquier `return` temprano, y el análisis puede suponer que todo el archivo queda dentro. El `scope` es el propio
archivo relativo a `src/app/[locale]/` sin extensión y la prueba exige que coincida. El layout raíz usa
`<ClientMessages scope="layout">` dentro de `<body>`, como antes.

En una página el proveedor se renderiza en cada navegación; en un layout, solo al entrar al segmento, así que un
layout entrega la unión de lo que piden sus hijos sin proveedor propio.

Alternativa descartada: elegir por `pathname` en el layout raíz. El layout raíz no se vuelve a renderizar en la
navegación del cliente, así que la página siguiente se quedaría con los textos de la primera.

### D3. Los proveedores anidados suman, no repiten

Un `NextIntlClientProvider` anidado reemplaza el contexto. Para no repetir en cada página los ~20 KB del layout raíz,
cada proveedor anidado entrega solo lo que no entregan los de arriba, y `NestedMessages` (cliente) los fusiona sobre
`useMessages()` del padre con `useMemo`, reenviando `useLocale`, `useTimeZone` y `useNow`. La app no configura
`formats`; si algún día lo hace, `NestedMessages` tiene que reenviarlos.

### D4. Gate en CI

`src/i18n/client-messages.test.ts` (entorno node, ~15–20 s) corre el mismo análisis y falla si:

- `client-messages.json` no coincide con lo que generaría (correr `pnpm run i18n:client-messages`);
- una página o layout bajo el layout raíz pide textos que el layout raíz no entrega por sus propios archivos
  (cabecera, menú, pie, error, no encontrado) sin declarar `withClientMessages` — así una página nueva no agranda en
  silencio lo que recibe toda la app;
- un `scope` no coincide con su archivo, se declara fuera de un archivo de ruta o un proveedor no aporta textos.

Las claves inexistentes ya las vigila `messages.keys.test.ts`; aquí no se exige que cada ruta exista, porque una
unión de literales puede incluir valores que el código protege con `t.has`.

### D5. Pruebas existentes sin cambios

`ClientMessages` es un componente de servidor asíncrono que jsdom no renderiza. `src/test/setup.ts` hace que
`withClientMessages` devuelva la ruta sin envolver y que `ClientMessages` sea transparente; `withClientMessages`
conserva el tipo de la ruta para que las pruebas la sigan llamando como función y Next valide sus `params`. Las
pruebas del propio módulo usan `vi.importActual`.

## Risks / Trade-offs

- **Un uso que el análisis no reconozca deja una clave fuera.** Mitigación: cualquier uso no reconocido de `t` entrega
  el namespace entero; la verificación en el navegador de las páginas medidas en es y en no mostró `MISSING_MESSAGE`.
  Un componente que reciba textos por otro camino (por ejemplo `useMessages()` directo) recibe todo.
- **Las páginas con proveedor propio vuelven a pedir su delta en cada navegación** (0,1–12 KB), en vez de tenerlo ya
  en el árbol completo. Es mucho menos que los ~160 KB que viajaban antes en cada respuesta.
- **El análisis tarda ~15 s** porque arma un programa de TypeScript; solo corre en el generador y en la prueba.
