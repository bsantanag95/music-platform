## ADDED Requirements

### Requirement: Subcadena primero en la coincidencia local

La coincidencia local por nombre (artistas) o título (álbumes y canciones), usada por las
sugerencias y por la parte local de la búsqueda, SHALL buscar primero los nombres que **contienen**
la consulta normalizada (sin distinguir mayúsculas ni acentos) y SHALL completar con las que casan
**solo** por similitud de trigramas únicamente si las de subcadena no llenan el cupo de candidatos
pedido, sin repetir filas y detrás de las de subcadena. El orden de los resultados SHALL seguir
siendo el de cada tipo (nivel de coincidencia y, a igualdad, actividad); dentro del último nivel, las
que contienen la consulta quedan antes que las solo parecidas. Una consulta con errata que no casa
por subcadena SHALL seguir encontrando el nombre por similitud, y completar el cupo SHALL NOT costar
más que la consulta combinada (subcadena o trigramas) que se hacía antes.

#### Scenario: Palabra común
- **WHEN** se buscan localmente álbumes para `the d` y más de 40 títulos contienen `the d`
- **THEN** los candidatos salen solo de la coincidencia por subcadena y no se ejecuta la consulta
  por similitud

#### Scenario: Errata
- **WHEN** se buscan localmente álbumes para `dark sied of the moon`
- **THEN** ningún título lo contiene, se completa por similitud y *The Dark Side of the Moon*
  aparece entre los candidatos

#### Scenario: Pocas subcadenas
- **WHEN** solo 3 títulos contienen la consulta y el cupo es 40
- **THEN** los candidatos son esos 3 seguidos de los mejores que solo casan por similitud, sin
  repetir ninguno
