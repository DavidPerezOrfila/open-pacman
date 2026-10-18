# SPEC 01 — Personalidades de los cuatro fantasmas

> **Estado:** Implemented
> **Depende de:** Ninguna
> **Fecha:** 2026-10-05
> **Objetivo:** Cada fantasma persigue con su lógica clásica de arcade (Blinky agresivo directo, Pinky embosca, Inky flanquea, Clyde tímido), aislada en un módulo propio `src/js/ghosts.js`.

## Por qué existe esta spec

El repo pasa de 4 a 5 `<script>`. Lo pide el usuario para modularizar de cara al futuro: la IA de fantasmas queda aislada en `src/js/ghosts.js`, y los modos scatter/frightened de specs futuras se añadirán solo ahí, sin tocar `src/js/game.js`.

## Alcance

**Dentro:**

- Nuevo `src/js/ghosts.js` con `GHOSTS` (una definición por fantasma) y su `<script>` en `src/index.html`, entre `maze.js` y `game.js`.
- Targeting propio por fantasma en modo persecución (chase): Blinky → casilla de Pac-Man; Pinky → 4 casillas delante de Pac-Man según su `dir`; Inky → vector Blinky→(2 casillas delante de Pac-Man) doblado; Clyde → Pac-Man a más de 8 casillas, su `corner` a 8 o menos.
- Sustituir en `src/js/game.js` el target común actual por `GHOSTS[ i ].target( game )`.
- Colores por fantasma en `src/js/render.js`: rojo, rosa, cian y naranja.
- Añadir Inky y Clyde a `GHOST_STARTS` en `src/js/maze.js` (índices 2 y 3), con posiciones de inicio dentro del corral; el código solo traía 2 fantasmas. Eliminar el campo `kind`, obsoleto.

**Fuera de alcance (para specs futuras):**

- Modo scatter periódico (alternar retirada a esquinas).
- Modo frightened y power pellets (huir, ser comido, ojos de regreso).
- Velocidades distintas por fantasma, sonidos, HUD.

## Modelo de datos

`GHOSTS` (array de 4, global `window.GHOSTS` en `src/js/ghosts.js`), un objeto por fantasma:

- `name`: `'blinky' | 'pinky' | 'inky' | 'clyde'`
- `color`: `'#ff0000'` rojo, `'#ffb8ff'` rosa, `'#00ffff'` cian, `'#ffb852'` naranja
- `corner`: celda transitable más cercana a su esquina del laberinto (blinky superior-derecha, pinky superior-izquierda, inky inferior-derecha, clyde inferior-izquierda); la fija la implementación leyendo `MAZE`
- `target( game )`: devuelve `{ x, y }`, la celda objetivo en chase

Cada fantasma del estado de `createGame()` se identifica por su índice en `GHOST_STARTS` (0 blinky, 1 pinky, 2 inky, 3 clyde). `GHOST_STARTS` pasa de 2 a 4 entradas en `src/js/maze.js` (inky `{x:12,y:14}`, clyde `{x:15,y:14}`); el campo `kind` de cada entrada se elimina por quedar obsoleto. No se añade más estado al juego.

## Plan de implementación

1. `src/js/maze.js`: añadir inky (`{x:12,y:14}`) y clyde (`{x:15,y:14}`) a `GHOST_STARTS` (índices 2 y 3, dentro del corral), manteniendo `kind` por ahora. Manual: la página carga con 4 fantasmas en movimiento y la consola queda limpia.
2. Crear `src/js/ghosts.js` con `GHOSTS` (name, color, corner, `target`) donde los cuatro `target` devuelven la casilla de Pac-Man (idéntico al comportamiento actual), exportar `window.GHOSTS` y añadir el `<script>` en `src/index.html` entre `maze.js` y `game.js`. Manual: la página carga igual y la consola queda limpia.
3. `src/js/render.js`: dibujar cada fantasma con `GHOSTS[ i ].color` en vez del color común. Manual: se ven los 4 colores distintos y el juego va igual.
4. `src/js/game.js`: sustituir el target común por `GHOSTS[ i ].target( game )`, con el índice mapeado a `GHOST_STARTS`; eliminar el campo `kind` de `maze.js`/`createGame()` y la rama `'random'` de `decideGhost()`. Manual: comportamiento idéntico al actual (los cuatro persiguen directo).
5. Implementar Pinky: 4 casillas delante de Pac-Man según su dirección de movimiento, con `DIRS`. Manual: el rosa corta el paso por delante.
6. Implementar Inky: punto 2 casillas delante de Pac-Man; vector desde Blinky hasta ese punto, doblado (target = punto + (punto − posición de Blinky)). Manual: el cian flanquea en coordinación con el rojo.
7. Implementar Clyde: distancia de Manhattan a Pac-Man > 8 → target Pac-Man; ≤ 8 → su `corner`. Manual: el naranja se acerca, se retira al estar cerca y vuelve a acercarse.

## Criterios de aceptación

> Verificación automatizada: abrir `tests/e2e.html` en el navegador (o `chrome --headless=new --dump-dom tests/e2e.html`); el resumen debe decir `E2E PASS`.

- [x] `src/index.html` carga `ghosts.js` entre `maze.js` y `game.js` y la consola queda limpia.
- [x] Los cuatro fantasmas se dibujan con colores distintos: rojo, rosa, cian y naranja.
- [x] Blinky (rojo) se dirige siempre hacia la casilla actual de Pac-Man.
- [x] Pinky (rosa) se dirige a la casilla situada 4 celdas delante de Pac-Man según su dirección de movimiento.
- [x] Inky (cian) se dirige al punto simétrico de Blinky respecto al punto situado 2 celdas delante de Pac-Man.
- [x] Clyde (naranja) persigue a más de 8 casillas (Manhattan) y se retira a su `corner` a 8 o menos.
- [x] Ningún fantasma atraviesa muros y la puerta del corral sigue bloqueando a Pac-Man pero no a los fantasmas.
- [x] El movimiento de Pac-Man (velocidad, giros, túnel) queda idéntico al actual.

> **Hallazgo del e2e (ajeno a esta spec):** los fantasmas no salen nunca del corral — `decideGhost()` nunca elige subir hacia la puerta porque el movimiento lateral siempre acorta o empata. Es previo a esta spec (ya ocurría con 2 fantasmas); la persecución no es observable en partida hasta arreglarlo.

## Decisiones

- **Sí:** archivo nuevo `src/js/ghosts.js` entre `maze.js` y `game.js`. El usuario pidió modularidad de cara al futuro; la IA de fantasmas queda aislada.
- **Sí:** un único global `window.GHOSTS`. `game.js` (targeting) y `render.js` (colores) consumen la misma definición.
- **Sí:** identificar fantasmas por índice de `GHOST_STARTS` (0-3). El orden ya existe; no se añade un campo `name` a cada entrada.
- **Sí:** tocar `maze.js` mínimamente para añadir Inky y Clyde a `GHOST_STARTS`, porque el código solo traía 2 fantasmas. Se elimina el campo `kind`, obsoleto al usar `GHOSTS[ i ].target( game )`.
- **Sí:** targets geométricos que pueden caer sobre muros o fuera del mapa. Es como funciona el arcade original: el target solo orienta la elección de dirección.
- **Sí:** distancia de Manhattan para Clyde. Simple y suficiente para el comportamiento tímido observable.
- **No:** reproducir el bug del arcade original de Pinky (desplazamiento extra cuando Pac-Man mira hacia arriba). Es un bug de hardware de 1980, no una feature.
- **Sí:** solo chase en esta spec (decisión del usuario). `corner` queda sembrado para el scatter futuro.

## Riesgos

| Riesgo                                            | Mitigación                                                                   |
| ------------------------------------------------- | ---------------------------------------------------------------------------- |
| Targets de Pinky/Inky caen sobre muros o fuera    | Son puntos geométricos: el algoritmo de dirección no exige celda transitable |
| Inky depende del fantasma 0 (Blinky)              | Fijar el mapeo de índices en un comentario de `ghosts.js`                    |
| Añadir Inky y Clyde cambia el número de fantasmas | Índices fijados en `GHOST_STARTS` y verificación manual al cerrar el paso    |
| Cambiar el targeting altera la dificultad         | Verificación manual de cada paso antes de pasar al siguiente                 |

## Qué NO entra en esta spec

- Scatter periódico, frightened y power pellets.
- Fantasmas comestibles, ojos de regreso al corral.
- Velocidades distintas por fantasma, sonidos, HUD.

Cada uno, si llega, va en su propia spec.
