# ADR 0043 — Premios adicionales, página de premios y criterios para sumar uno

## Estado

Aceptado (cambio `add-four-music-awards`, 2026-10). Extiende los ADR 0032 (premios curados en JSON versionado) y 0042
(niveles y campos de categoría) sin reescribirlos.

## Contexto

Los premios eran solo los Grammy (2021–2026). El modelo ya admitía otro premio agregando su carpeta en `data/awards/`,
pero la página no: la sección "Premios" de Explorar mostraba las últimas 5 ceremonias de cualquier premio (la
dominarían los que se celebran en febrero) y `/awards` redirigía porque había un solo premio. Además la página no
decía de dónde salen los datos ni quién decide cada premio.

## Decisión

1. **Cuatro premios más**, con las ceremonias cerradas de 2021 en adelante: Latin Grammy, Premio Lo Nuestro, Brit
   Awards y Mercury Prize. Las ediciones de 2026 del Latin Grammy (12-nov) y del Mercury (22-oct) se agregan cuando se
   celebren (el modelo solo admite ceremonias cerradas).
2. **Criterios para sumar un premio:**
   1. el sujeto de cada categoría es un álbum, una grabación o un artista del catálogo;
   2. hay ceremonias cerradas desde 2021;
   3. se decide por una academia o industria, un jurado o una votación mixta (público y comité): no por votos
      exclusivamente del público ni por listas de ventas o de reproducciones; no hace falta "mérito", pero sí que sea un
      premio y no una lista;
   4. es relevante para una interfaz en español;
   5. el volumen es abordable (el costo es la curaduría, no el código).
   Quedan descartados con ese criterio: los AMAs (votación solo de fans y un año sin ceremonia), los Billboard Latin
   Music Awards (ganan las listas), los Juno (volumen y relevancia), los Ivor Novello (nicho), los Polaris (duplican el
   formato del Mercury) y los MTV VMAs, EMAs y BET (premian videos, coreografía o dirección: el modelo no tiene ese
   sujeto).
3. **Alcance por premio:** toda categoría con nominados cuyo sujeto sea un álbum, una grabación o un artista. No se
   cargan los reconocimientos honoríficos, el video, la ingeniería, los arreglos, el empaque ni las composiciones
   clásicas. Las categorías se reparten en los tres niveles del ADR 0042; los campos nuevos son urbano, tropical,
   regional mexicano, cantautor, brasileña y portuguesa y "otros géneros" (un cajón de sastre deliberado para las pocas
   categorías de cada género menor).
4. **Una tarjeta por premio.** La sección "Premios" de Explorar y el hub `/awards` (con más de un premio) muestran la
   ceremonia más reciente de cada premio (`listLatestCeremoniesByAward`, una consulta para las ceremonias y otra para
   los ganadores), con la misma tarjeta (`AwardTile`). Con un solo premio, `/awards` sigue redirigiendo. Las migas de
   pan ganan el nivel "Premios" (Inicio / Premios / premio / año).
5. **Tipo de votación por premio, visible en la ceremonia.** Cada premio declara en su `categories.json` quién
   decide (`voting`: `academy`, `jury`, `public` o `mixed`; obligatorio) y la cabecera de la ceremonia lo dice en una
   línea. Es por premio, no por categoría: una excepción (una categoría de los Brit votada por el público) no se marca.
   Grammy, Latin Grammy y Brit Awards = academia; Mercury Prize = jurado; Premio Lo Nuestro = mixto (público y comité).
6. **Fuente visible.** Cada ceremonia guarda su `sourceUrl` y la cabecera enlaza "Fuente: <sitio>" (atribución de
   Wikipedia, CC BY-SA). La migración `0073` agrega `award.voting` y `award_ceremony.source_url`, ambas nulas hasta la
   próxima carga: no se inventan valores de relleno y la página omite el dato mientras falte.
7. **Los datos se cargan solo en la base de prueba** dentro del cambio; cargar en la base real es el paso operativo de
   `load-awards.ts`.

## Consecuencias

- Sumar un premio es una carpeta nueva en `data/awards/`, un nombre en `messages/*/awards.json` (`names.<slug>`), sus
  campos nuevos si los hay y la revisión contra los criterios de arriba; la página no cambia.
- El hub y la sección de Explorar crecen con los premios: con más de ~8 tarjetas habrá que paginar o agrupar (no hoy).
- El tipo de votación y la fuente son datos curados: si cambian (un premio pasa a votación del público), se corrige el
  archivo y se vuelve a cargar.
- Las nominaciones sin resolver a MusicBrainz se muestran como texto (ADR 0032, decisión 4); las grafías de los
  títulos del catálogo pueden diferir de las curadas.
