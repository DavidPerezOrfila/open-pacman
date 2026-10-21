# SPEC 04 â€” Comer fantasmas asustados

> **Estado:** Implementado
> **Depende de:** Spec 03 (power pellets y modo frightened)
> **Fecha:** 2026-10-22
> **Objetivo:** durante el modo frightened, tocar un fantasma se lo come: suma puntos, el fantasma vuelve al corral y deja de ser comestible el resto del modo.

## Por quÃ© existe esta spec

La spec 03 dejÃ³ a propÃ³sito los fantasmas como inmunes: en frightened solo huÃ­an y Pac-Man los atravesaba. Eso convierte la power pellet en una simple pausa de 8 segundos y no en la revancha clÃ¡sica del arcade. AdemÃ¡s, al no haber estado por fantasma, tampoco se distinguÃ­a a simple vista cuÃ¡les eran comestibles: el frightened no se veÃ­a en pantalla.

## Alcance

**Dentro:**

- Estado por fantasma `eaten`: `false` al empezar la partida y al acabar el frightened; `true` tras ser comido.
- Contador `game.ghostsEaten`: fantasmas comidos con la pellet actual. Se reinicia al comer otra pellet.
- Puntos por fantasma comido dentro de la misma pellet: 200, 400, 800 y 1600.
- Al comer un fantasma frightened: suma puntos, el fantasma vuelve a su celda de `GHOST_STARTS` mirando arriba y queda marcado `eaten`.
- `ghostEdible( game, g )` = `frightened( game ) && !g.eaten`, expuesto como global en `src/js/ghosts.js`.
- Un fantasma `eaten` ya no es comestible, no huye y se mueve a velocidad normal; al acabar el frightened vuelve a ser un fantasma normal.
- Velocidad `FRIGHTENED_SPEED` solo para fantasmas comestibles.
- `render.js` pinta de azul (`#2121ff`) los fantasmas comestibles; el resto, con su color de la spec 01.
- Chocar con un fantasma frightened no comestible (reciÃ©n comido) tampoco resta vida.

**Fuera (specs futuras):**

- Ojos que recorren el laberinto hasta el corral: aquÃ­ el fantasma reaparece directamente en el corral.
- Pausa de reapariciÃ³n dentro del corral antes de volver a salir.
- Parpadeo blanco en los Ãºltimos segundos del frightened.
- Contador de fantasmas comidos en el HUD.

## Modelo de datos

Estado de la partida, en `createGame()` (`src/js/game.js`) y `createGhostMode()` (`src/js/ghosts.js`):

- `game.ghostsEaten`: entero, `0` al empezar y en cada `startFrightened()`.
- `game.ghosts[ i ].eaten`: booleano, `false` en `createGame()` y al agotarse el frightened.

Constantes nuevas en `src/js/ghosts.js`:

- `GHOST_POINTS = 200`: base; el fantasma n-Ã©simo de la pellet vale `GHOST_POINTS * 2 ** n`, tope 1600.

`src/js/ghosts.js` expone:

- `ghostEdible( game, g )` â†’ `true` solo si el modo estÃ¡ activo y ese fantasma no ha sido comido.

`src/js/game.js`, en `update()`:

- Al colisionar con un fantasma comestible: suma puntos, `ghostsEaten++`, `eaten = true`, posiciÃ³n y direcciÃ³n de `GHOST_STARTS[ i ]`.

## Plan de implementaciÃ³n

1. `ghosts.js`: `eaten: false` en `createGame()`, `ghostsEaten` y `GHOST_POINTS`, `ghostEdible()` y limpieza de `eaten` al agotarse el frightened. Manual: el juego va igual, sin cambios visibles.
2. `game.js`: comer fantasma comestible (puntos, contador, vuelta al corral) y velocidad de huida solo para comestibles. Manual: al tocar un fantasma durante la pellet suma puntos y el fantasma reaparece en el corral.
3. `render.js`: color azul para los comestibles. Manual: se distingue a simple vista quÃ© fantasmas se pueden comer.
4. `tests/e2e.js` y `tests/e2e.playwright.js`: casos de puntos, contador, vuelta al corral, fin de la comestibilidad y color. Manual: `tests/e2e.html` y el e2e de Playwright en verde.

## Criterios de aceptaciÃ³n

> VerificaciÃ³n automatizada: abrir `tests/e2e.html` en el navegador; el resumen debe decir `E2E PASS`. El e2e de navegador real (`tests/e2e.playwright.js`, ver `AGENTS.md`) debe imprimir `E2E PASS`.

- [x] Comer un fantasma frightened suma 200 puntos; el segundo de la misma pellet, 400; despuÃ©s 800 y 1600.
- [x] Comer una pellet nueva reinicia la escala a 200.
- [x] El fantasma comido vuelve a su celda de `GHOST_STARTS` mirando arriba.
- [x] Un fantasma comido no es comestible, no huye y va a velocidad normal hasta que acaba el frightened.
- [x] Al acabar el frightened todos los fantasmas vuelven a ser normales (`eaten = false`).
- [x] Los fantasmas comestibles se dibujan azules; los demÃ¡s, con su color propio.
- [x] Tocar un fantasma comestible no resta vida; tocar uno normal sigue restÃ¡ndola.
- [x] Los 31 casos de las specs 01, 02 y 03 siguen en verde.

## Decisiones

- **SÃ­:** reaparecer directamente en el corral, sin ojos que lo recorran. El jugador ve el mismo resultado (el fantasma desaparece y vuelve a salir) con cero estado nuevo de pathing. Los ojos son un efecto visual que se puede aÃ±adir encima.
- **SÃ­:** `eaten` por fantasma en vez de un temporizador de respawn. Sin Ã©l, un fantasma reciÃ©n comido volverÃ­a a ser comestible al salir del corral y se podrÃ­a encadenar puntos infinitos.
- **SÃ­:** la escala 200/400/800/1600 se reinicia al comer otra pellet, no al acabar el frightened. Es la regla del arcade y sale gratis del contador.
- **SÃ­:** azul para los comestibles dentro de esta spec, aunque la 03 no lo pedÃ­a. Sin color el jugador no sabe a quiÃ©n puede comerse; es la mitad observable de la funcionalidad.
- **No:** parpadeo blanco en los Ãºltimos segundos. Efecto visual sin reglas nuevas; va con los ojos en otra spec.

## Riesgos

| Riesgo | MitigaciÃ³n |
| ------ | ---------- |
| El fantasma reaparece en el corral y vuelve a salir durante el mismo frightened | `eaten` lo mantiene no comestible y con targeting normal hasta que el modo acabe |
| Cambiar la velocidad por fantasma rompe la alineaciÃ³n de celdas | `FRIGHTENED_SPEED` y `GHOST_SPEED` siguen siendo `1/N` |
| El color azul choca con el cian de Inky | Azul `#2121ff` frente a cian `#00ffff`; el test de canvas compara canales con tolerancia 32 |
| El e2e de Playwright necesita que un fantasma muera para probar la colisiÃ³n normal | Se coloca el fantasma en la celda de Pac-Man desde `page.evaluate`, como ya hace `tests/e2e.js` |

## QuÃ© NO entra en esta spec

- Ojos de regreso al corral y pausa de reapariciÃ³n.
- Parpadeo de los fantasmas al terminar el modo.
- Contador de fantasmas comidos en el HUD.
- Dificultad o duraciÃ³n por nivel.

Cada uno, si llega, va en su propia spec.
