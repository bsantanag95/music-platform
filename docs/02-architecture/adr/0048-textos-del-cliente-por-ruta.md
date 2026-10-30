# ADR 0048 — Textos del cliente por ruta, calculados sobre el código

## Estado

Aceptado (cambio `trim-client-messages`, 2026-10). Extiende el ADR 0007 (i18n con `next-intl`) sin reescribirlo: el
servidor sigue cargando todos los catálogos; cambia qué parte viaja al cliente.

## Contexto

El layout raíz pasaba a `NextIntlClientProvider` el objeto completo de `getMessages()`: ~162 KB en `es` (~155 KB en
`en`) que iban en cada respuesta RSC y en el HTML de cada página, también en la navegación del cliente. Medido en un
build de producción, eran ~165 KB de los ~195 KB de una respuesta de `/me/settings/*`. Los componentes cliente de una
página usan una fracción: el más grande, el de Inicio, pide ~32 KB.

`next-intl` propone elegir namespaces con `pick` en proveedores anidados. Aquí no alcanza: casi todo componente cliente
toca `users`, `catalog` o `errors` (los tres más grandes) para leer unas pocas claves, y listas escritas a mano se
desactualizan sin que nada lo note, porque las pruebas cargan todos los mensajes.

## Decisión

1. **Las claves se calculan sobre el código.** `src/i18n/client-messages-analysis.ts` arma un programa de TypeScript
   con los archivos de ruta de `src/app/[locale]/`, recorre sus imports, toma los módulos bajo `"use client"` y
   resuelve cada `useTranslations(ns)` y sus llamadas a rutas de mensajes (literal, unión de literales, prefijo
   estático de una clave dinámica, `t` seguida dentro de las funciones y componentes que la reciben). Lo que no puede
   acotar lo entrega entero. `scripts/generate-client-messages.ts` guarda el resultado en
   `src/i18n/client-messages.json`.
2. **Un proveedor por archivo de ruta.** El layout raíz entrega lo que piden sus propios archivos (cabecera, menú, pie,
   error, no encontrado). Cada página o layout que pide más se exporta con `withClientMessages("<archivo>", Ruta)`,
   que envuelve el componente entero. No se elige por `pathname` en el layout raíz porque el layout raíz no se vuelve a
   renderizar al navegar en el cliente.
3. **Los anidados suman.** Cada proveedor anidado entrega solo lo que no entregan los de arriba; `NestedMessages`
   (cliente) lo fusiona sobre los mensajes del padre y reenvía locale, zona y `now`.
4. **CI lo vigila.** `src/i18n/client-messages.test.ts` corre el análisis y falla si el JSON quedó viejo, si una ruta
   pide textos que el layout raíz no entrega sin declarar su proveedor, o si un proveedor no coincide con su archivo o
   no aporta nada.

## Consecuencias

- Las respuestas medidas bajan 130–145 KB sin comprimir: la RSC pasa de 181–229 KB a 50–98 KB y el HTML de
  218–329 KB a 73–185 KB (gzip: RSC de 52–71 KB a 16–35 KB). Ver la tabla en `docs/02-architecture/i18n.md` §9.
- Tocar un componente cliente que usa `useTranslations` o crear una página exige correr
  `pnpm run i18n:client-messages`; la prueba lo recuerda.
- Una clave que llega por variable o prop se tipa como unión de literales en vez de `string`, o se entrega el
  namespace entero.
- `errors` va entero en el layout raíz: sus códigos llegan de la API en runtime.
- El análisis tarda ~15 s; solo corre en el generador y en la prueba, nunca en runtime. No suma dependencias
  (`typescript` ya lo era).
- Si la app configura `formats` de `next-intl`, `NestedMessages` tiene que reenviarlos.
