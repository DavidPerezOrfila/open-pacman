# PLAN — Spec 01: Personalidades de los cuatro fantasmas

Objetivo: aislar la IA de los 4 fantasmas en `src/js/ghosts.js` y dar a cada uno su
targeting clasico de arcade (Blinky directo, Pinky embosca, Inky flanquea, Clyde timido).

- Spec: `specs/01-personalidades-fantasmas.md` (Approved)
- Rama: `spec-01-personalidades-fantasmas`

## Pasos y verificacion

| # | Paso | Verificacion | Estado |
|---|------|--------------|--------|
| 1 | `maze.js`: anadir inky/clyde a `GHOST_STARTS` | 4 fantasmas, consola limpia | hecho |
| 2 | `ghosts.js`: `GHOSTS` + `<script>`, target = casilla Pac-Man | consola limpia | hecho |
| 3 | `render.js`: color desde `GHOSTS[i].color` | 4 colores distintos | hecho |
| 4 | `game.js`: `GHOSTS[i].target(game)` y quitar `kind` | los 4 persiguen directo | hecho |
| 5 | Pinky: 4 celdas delante de Pac-Man segun `dir` | corta el paso | hecho |
| 6 | Inky: reflejo de Blinky respecto al punto 2 delante | flanquea | hecho |
| 7 | Clyde: Manhattan >8 -> Pac-Man; <=8 -> `corner` | se acerca y se retira | hecho |

- Automatica: `node --check` + smoke `%TEMP%\opencode\pacman-smoke.js` y `pacman-targets.js`.
- Manual: abrir `src/index.html`, consola limpia, jugar.
