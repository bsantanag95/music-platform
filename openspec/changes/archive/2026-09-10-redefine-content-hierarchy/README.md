# redefine-content-hierarchy

Explorar y definir la jerarquía conceptual entre artista, álbum y canción: el álbum como
unidad de crítica, la canción como unidad de hábito, el artista como unidad de
descubrimiento; y la separación entre obra y evento de consumo.

> **Estado: EXPLORACIÓN — todas las decisiones de producto y diseño cerradas.** Este
> cambio captura una dirección conceptual, no una implementación. Contiene `proposal.md` y
> `design.md`; **no** tiene deltas de spec a propósito (`openspec validate` fallará por
> eso).
>
> Q1–Q7 (producto), OQ1–OQ5 (diseño Fase 1) e IQ1–IQ5 (implementación Fase 1) están
> **resueltas** (`design.md` → "Resolved Questions"). Solo restan:
> - **Fase 0 técnica** (`design.md` → D12): canonicalización `release-group`, contenido
>   semilla, decisión de esquema de `reviews` (IQ3, según roadmap del equipo).
> - **Diferido a Fase 2+** (`design.md` → última sección): decay sofisticado,
>   notificaciones de artista, importación de escuchas, reseñas de canción prominentes.
>
> Fase 0 en marcha: la canonicalización de `release-group` es el cambio
> `canonicalize-release-group` (proposal + design + specs + tasks listos).
>
> La implementación se hará en cambios posteriores acotados, uno por superficie, según la
> secuencia de `design.md` → D12.
