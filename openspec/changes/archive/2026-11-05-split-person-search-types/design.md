## Context

`artistType` vale hoy `person` o `group` y se traduce tal cual a la base (`artist.type`) y a MusicBrainz (`type:`).
`add-catalog-search-fields` agregó `role` (`own|member|producer|musician`), aceptado solo con `person` y siempre solo del
catálogo. MusicBrainz no indexa en la búsqueda de artistas cuántos discos tiene alguien, así que "tiene discos propios"
solo lo sabe la base propia: créditos `credit.role = 'primary'` y `artist.discography_synced_at` (discografía explorada).
Muchas personas del catálogo son stubs creados por pertenencias o créditos, con la discografía sin explorar y sin
créditos propios aunque tengan carrera solista (p. ej. un integrante cargado desde la ficha de su banda).

## Goals / Non-Goals

**Goals:** Solista con la misma búsqueda que Grupo (base + MusicBrainz); Otras personas como búsqueda explícita de roles;
URL anteriores legibles.

**Non-Goals:** inferir discos propios de personas fuera del catálogo; cambiar las condiciones de rol, el orden o la
búsqueda simple.

## Decisions

**1. Valores de URL `solo` y `other`, sin `person`.** `artistType=group|solo|other`. `solo` va a MusicBrainz como
`type:person`; `other` nunca va a MusicBrainz y se suma a `CATALOG_ONLY_KEYS` como valor (no como clave: `artistType`
sigue siendo un campo con cláusula). Alternativa descartada: mantener `person` como Solista y agregar `other`, que deja
un nombre de URL que no dice lo que filtra.

**2. Solista quita solo lo que el catálogo sabe.** Modo habitual: `type = person` en local y `type:person` en
MusicBrainz, y después de fusionar por `mbid` se descartan las filas con `discography_synced_at IS NOT NULL` y ningún
disco propio (lectura por lote de los ids de la página). Una persona sin discografía explorada se conserva: excluir "sin
créditos propios" a secas dejaría fuera a solistas cargados como integrantes. Modo solo catálogo (Solista con género,
premios o actividad): se exige algún disco propio, como el antiguo `role=own`, porque ahí solo cuenta lo que ya está en
la base. Alternativa descartada: una consulta extra a MusicBrainz por resultado para contar discos, fuera del
presupuesto de solicitudes.

**3. Otras personas: sin rol, sin discos propios; con rol, el rol manda.** Sin rol: `type = person`, ningún crédito
propio y alguna pertenencia o crédito de personal. Con rol: la condición del rol de hoy, sin exigir que no tenga discos
propios, porque "integrantes de bandas chilenas" debe incluir a quien además tiene carrera solista. `role` se acepta
solo con `other`; con otro tipo se ignora. "Activo entre" se calcula con los discos propios, así que no se ofrece con
Otras personas y `activeFrom`/`activeTo` se ignoran con `other`, como un parámetro que no corresponde al tipo.

**4. Lectura tolerante de lo anterior en `parseCriteria`.** `person` → `solo`; `person` + `role=own` → `solo` sin rol;
`person` + `member|producer|musician` → `other` con ese rol; `role=own` en cualquier otro caso se ignora. Así las
búsquedas recientes guardadas como URL y los enlaces compartidos siguen funcionando sin migrar nada.

**5. Textos.** Opciones "Grupo", "Solista", "Otras personas" con la ayuda "Integrantes, producción, músicos de sesión";
rol "Músico invitado o de sesión" (mismo `musician`). Año: "Año de nacimiento" con Solista y Otras personas. Encabezado:
"N solistas" / "N personas" / "N grupos".

## Risks / Trade-offs

- [Solista incluye personas de MusicBrainz sin discos propios que el catálogo no conoce] → una búsqueda por nombre de
  persona casi siempre trae solistas; se documenta como límite en la ayuda del campo y en `catalog-browsing.md`.
- [Solista en modo catálogo es más estricto que en modo habitual] → es la misma regla del modo catálogo para el resto
  de campos (solo lo que está en la base) y lo anuncia el aviso "Solo artistas del catálogo".
- [El filtro de Solista agrega una lectura por página] → una sola consulta por lote sobre los ids ya resueltos, como
  "Integrante de"; se mide con el resto de la página.
- [Producción incluye créditos sobre los discos propios] → sin cambio en este cambio; con Otras personas sin rol ya no
  aparecen solistas.
