# ADR 0021 — Wikimedia como fuente del perfil de artista

## Estado

Aceptado (cambio `enrich-artist-profile`, 2026-09).

## Contexto

Hasta este cambio, MusicBrainz era la única fuente externa del catálogo (más Cover Art Archive
para las carátulas). La página de artista debe ser un híbrido entre ficha de biblioteca y
biografía, y MusicBrainz no ofrece foto ni texto biográfico: `artist.bio` guardaba en realidad
la desambiguación ("Chilean alternative rock band", en inglés y a menudo vacía) y
`artist.photo_url` no se escribía nunca.

Verificación en vivo (2026-09-27): MusicBrainz declara la relación de URL `wikidata` incluso en
bandas pequeñas (Kuervos del Sur, de Curicó). Desde la entidad de Wikidata se llega a una foto en
Wikimedia Commons (propiedad P18), a una descripción corta traducida, al artículo de Wikipedia de
cada idioma y a los lugares de nacimiento (P19) o de formación (P740) con su país.

Dos trampas encontradas:

- La miniatura del resumen de Wikipedia puede **no ser libre**: la de Pink Floyd en la Wikipedia
  en inglés es una imagen de uso justo alojada fuera de Commons.
- La relación `image` de MusicBrainz no es confiable: la de Mon Laferte apunta a un diario.

## Decisión

1. **Wikidata, Wikipedia y Commons pasan a ser fuentes del perfil de artista, subordinadas a
   MusicBrainz.** Se llega a ellas **solo** desde la relación `wikidata` que declara
   MusicBrainz para ese artista; nunca se busca una entidad por nombre, para no confundir
   homónimos. Un artista sin esa relación queda sin datos de Wikimedia.
2. **Un único cliente** (`src/services/wikimedia/client.ts`), con el mismo patrón que el de
   MusicBrainz: User-Agent obligatorio con contacto (`WIKIMEDIA_USER_AGENT`, fail-closed), cola
   serial y `maxlag` en la API de Wikidata. Ningún otro módulo construye URLs de Wikimedia.
3. **La foto sale solo de P18 (Commons)** y se acepta únicamente con una licencia libre
   verificada en los metadatos del archivo (dominio público, CC0, CC BY, CC BY-SA). Se guardan
   autor, licencia y enlaces para el crédito obligatorio. Nunca se usa la miniatura del resumen
   de Wikipedia. Se sirve una miniatura de Commons de a lo sumo 500 px (hotlink permitido por
   Wikimedia); un espejo propio queda para después.
4. **Descripción y resumen por idioma** (español e inglés), sin traducción automática: si un
   idioma no tiene artículo, se muestra el del otro indicando su idioma.
5. **Todo el enriquecimiento corre en segundo plano** (`after()`, candado por artista, vigencia de
   30 días) y un fallo de Wikimedia conserva los datos anteriores: la página nunca depende de
   Wikimedia para construirse.
6. **Retiro de fotos a pedido** con un script que vacía la foto y marca al artista para que no se
   le vuelva a asignar.
7. **Los géneros de MusicBrainz no se ingieren**: son etiquetas, datos suplementarios con licencia
   CC BY-NC-SA 3.0 (no comercial). La fuente de los géneros queda pendiente; la alternativa CC0
   es la propiedad de género de Wikidata (P136).

## Consecuencias

- Licencias que se suman (ver `docs/03-data/data-licensing.md`): Wikidata es CC0; el texto de
  Wikipedia es CC BY-SA 4.0 (atribución visible con enlace al artículo y a la licencia); cada foto
  de Commons tiene su licencia y exige crédito.
- `artist.bio` se renombra `artist.disambiguation`, que es lo que guarda.
- `artist.photo_url` empieza a tener valor, así que otras superficies (artistas seguidos,
  Exploración del perfil) muestran fotos.
- Hasta cinco requests a Wikimedia por artista, en segundo plano; la primera visita de un artista
  responde sin foto ni resumen, y un backfill cubre a los existentes.
- El vandalismo en Wikipedia o Wikidata se corrige con la actualización cada 30 días; el retiro
  cubre el caso urgente de una foto.
