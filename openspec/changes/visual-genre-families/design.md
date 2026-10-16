## Context

`listGenreFamilies()` cuenta, por familia, los `release_group` con algún género efectivo de estilo (con herencia) y la tarjeta
`FamilyGrid` muestra ese número y una barra de raíz cuadrada. En la base de scratch: Rock 17.317, pero 3.373 de estudio; de
29.678 artistas solo 890 tienen la discografía descargada. El número es un artefacto de qué se ha explorado, y la sección
compite con las colecciones (que ya son visuales) siendo la única parte de `/explore` que se lee como una tabla.

## Goals / Non-Goals

**Goals:**
- Que la tarjeta de familia sea imagen primero: carátulas reales y el nombre.
- Que no haya ninguna cifra que cambie sin que la plataforma haya hecho nada.
- Que la portada no pague una consulta pesada en cada visita.

**Non-Goals:**
- Cambiar qué familias existen, su orden o el listado al que llevan.
- Curar a mano la imagen de cada familia.

## Decisions

1. **Mosaico a sangre, no abanico.** Las colecciones usan fundas apiladas en un escenario enmarcado; los géneros usan una
   tarjeta cuadrada llena de carátulas (2×2) con el nombre abajo sobre un velo. Es el lenguaje de "categoría" de las apps de
   música y no se confunde con el de colección (ADR 0038: que se vean distintas es parte del modelo). Con 3 carátulas, la
   primera ocupa las dos filas; con 2, dos columnas; con 1, una sola a sangre; con 0, tarjeta plana.
2. **Qué carátulas: estudio, con carátula, por la señal de las colecciones.** Discos `studio` con `cover_thumb_url`, ordenados
   por premio ganador/nominado, rango de popularidad del calendario y, al final, el id (estable). La señal de valoración de la
   comunidad (`communityScore`) también entra en `albumSignalOrder`, así que las familias mejoran solas cuando la comunidad
   opine. Un disco puede salir en dos familias (un rock/pop); no se evita: sería una restricción cruzada sin beneficio claro.
3. **Una consulta con ventana y no veinte.** `row_number() over (partition by family_key order by …) <= 4` sobre los discos de
   estudio con carátula. En frío tarda ~0,8 s sobre 47.000 discos con género.
4. **Caché en memoria con TTL.** Un módulo con el resultado y su hora, vigente 6 horas, y una promesa en vuelo para que
   visitas simultáneas no lancen la consulta varias veces. Sin dependencia nueva ni infraestructura: el resultado solo cambia
   cuando entran discos nuevos o cambia la señal, y unas horas de retraso no se notan. Si la instancia se reinicia, se
   recalcula. Un error de la consulta no se cachea: la portada se renderiza con tarjetas planas y reintenta en la próxima
   visita.
5. **El conteo se queda en el servicio.** `FamilyBucket.count` sigue omitiendo las familias vacías y ordenando; la interfaz
   deja de recibirlo.
6. **Accesibilidad.** Las carátulas son decorativas (`alt=""`); el enlace se nombra con la familia. El velo garantiza el
   contraste del nombre sobre cualquier carátula. Foco visible con el borde ámbar, como el resto de tarjetas.

## Risks / Trade-offs

- **Las carátulas dependen de qué se haya resuelto:** hoy Latina, Mundo, Hablada, Religiosa y Brasileña no tienen ningún disco
  de estudio con carátula y salen planas. Mejora sola cuando se resuelvan carátulas, y la tarjeta plana es un estado válido.
- **Caché por instancia:** con varias instancias cada una calcula la primera vez. Es una consulta de ~1 s cada 6 horas.
- **Imágenes extra en la portada:** hasta 80 miniaturas de 250 px (20 familias × 4) si se despliegan las secundarias; las
  secundarias están plegadas y la carga de imágenes es perezosa.
