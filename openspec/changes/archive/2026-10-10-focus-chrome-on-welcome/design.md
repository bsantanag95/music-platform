## Decisiones

**D1 — Una variante, no un layout aparte.** El layout de locale monta Header y Footer para todas las rutas. Mover `/welcome` a un grupo de rutas con su propio layout obligaría a partir `[locale]/layout.tsx` en dos y mover decenas de carpetas. En cambio, el Header (ya cliente, ya con `usePathname`) devuelve una versión reducida y el Footer se elige con un selector cliente.

**D2 — `FooterSlot` elige entre dos pies renderizados por el servidor.** El Footer es un Server Component asíncrono y no conoce la ruta. El layout renderiza `<Footer>` completo y `<Footer variant="minimal">` y `FooterSlot` (cliente, `usePathname`) muestra uno. En la petición inicial `usePathname` ya conoce la ruta, así que el HTML del servidor sale con el pie correcto y sin JavaScript sigue funcionando; en la navegación desde o hacia `/welcome` el layout persiste y solo cambia cuál se muestra. Costo: se renderiza un pie de más en el servidor (texto estático).

**D3 — La atribución no se recorta.** El pie mínimo conserva el bloque de atribución completo (incluido el retiro de carátulas cuando está configurado) y los enlaces legales. Quitar el pie de una pantalla que muestra carátulas del Cover Art Archive y datos de MusicBrainz rompería el lugar donde `data-licensing.md` materializa la atribución.

**D4 — El logo es la salida, no un hueco.** Se mantiene el logo enlazado a Inicio: es la salida mínima y segura (el progreso se conserva en la pestaña y Inicio sigue ofreciendo «Completa tu perfil musical»). Se mantiene el selector de idioma porque quien se registró puede querer cambiarlo ahí.

**D5 — Sin salto al contenido.** El hallazgo señalaba que no existe; con la navegación reducida no hay bloques repetidos que saltar en esta pantalla, y un salto global exigiría un `id` común en el `<main>` de todas las páginas (cambio aparte).

**D6 — `isFocusRoute` compara contra una lista.** `/welcome` y sus subrutas; un prefijo parecido (`/welcomed`) o una ruta anidada con ese nombre (`/me/welcome`) no cuentan.
