# AGENTS.md — Pac-Man MVP

Vanilla JS + HTML + CSS. **No build, no bundler, no package.json, no tests, no linter.** Don't add any of those unless a spec explicitly asks for it.

## Engineering principles

- **No backward compatibility.** Delete obsolete paths; no shims, fallbacks or migrations.
- **Simplest thing that meets current requirements.** No speculative abstractions, config or indirection.
- **Layered growth.** Smallest end-to-end working version first; add capabilities only on top of a working product.
- **Modular, separated concerns.**
- **Reuse before writing.** Use existing project dependencies first, then established libraries. Check docs/types before assuming a capability is missing. No reimplementing common functionality.
- **Long-term decisions only.** No stopgaps meant to be replaced later.

## Code style

- Replies: short and concise.
- Code in English (identifiers, functions, classes). Comments in Spanish, only when they add value.
- Small functions, readable code, DRY, SOLID where applicable.
- Self-documenting code; no magic or cryptic expressions.
- Apply security best practices when relevant.

## Line endings

- Repo uses **LF** (`.gitattributes`: `* text=auto eol=lf`). Never commit CRLF.
- Always write/edit files with LF.
- On Windows, `core.autocrlf=true` or OneDrive can leave CRLF in the working tree; git may show clean while the committed blob drifts. Verify the blob, not the working tree: `git show HEAD:path | grep -c $'\r'` must be 0.
- If a committed file has CRLF: convert it to LF, or run `git add --renormalize .` in a dedicated commit.

## Run it

Open `src/index.html` directly in the browser (`file://` works). There is no dev server.

Manual verification: load the page, check the console is clean, play. There is also an e2e harness with no dependencies: open `tests/e2e.html` in the browser (or `chrome --headless=new --dump-dom tests/e2e.html`); its summary line must read `E2E PASS`.

## Architecture

Five classic `<script>` files, loaded in this order in `src/index.html`. There are **no ES modules and no imports** — files communicate through globals that each file exports at its bottom via `window.X = X`:

- `src/js/maze.js` → level data: `MAZE`, `TUNNEL_ROW`, `PACMAN_START`, `GHOST_STARTS`
- `src/js/ghosts.js` → ghost AI: `GHOSTS` (color, corner, target) and the scatter/chase mode
- `src/js/game.js` → rules/state: `createGame`, `update`, `DIRS`
- `src/js/render.js` → drawing: `draw`
- `src/js/main.js` → loop, keyboard, overlay screens

Consequences an agent will otherwise get wrong:
- Adding a new file means adding a `<script>` tag in the right position. Order matters: `maze` → `ghosts` → `game` → `render` → `main`.
- A new global must be explicitly assigned to `window` or other files won't see it.

## Maze invariants (`src/js/maze.js`)

- `MAZE_STR` is 31 rows × 28 chars, then parsed to numbers: `#` wall=1, `.` dot=2, ` ` walkable-empty=0, `-` pen door=3.
- Every row must stay exactly 28 chars and keep the vertical-axis symmetry (between columns 13 and 14). Off-by-one here breaks everything silently.
- Trailing comment on each row is its index; keep it accurate when inserting rows.
- Tile values are referenced numerically in `game.js` (`isWall`, dot eating) and `render.js`. Change values there together.
- `MAZE` is pristine and must never be mutated. `createGame()` deep-copies it into `game.grid`; rendering and eating read `game.grid`, never `MAZE`.
- Pen door (3) blocks Pac-Man but not ghosts. Keep that distinction in mind when editing walls.

## Canvas geometry

`TILE = 20` in `render.js`; canvas `width`/`height` in `src/index.html` (`560x620`) are derived from maze size × TILE. Changing either without the other breaks the layout. Render reads dimensions from `game.grid`, not from the canvas element.

## Movement model (`src/js/game.js`)

- Positions are fractional cell coordinates (floats). Decisions only happen when `aligned(v)` is true, i.e. at integer cells.
- Speeds are fractions of a cell per frame (`0.125` = 1/8, `0.1` = 1/10) chosen so actors land exactly on cell boundaries. Keep them as `1/N` or the movement starts drifting.
- Tunnel wrap applies only on `TUNNEL_ROW` (`wrapTunnel`).
- `nextDir` is the buffered turn, applied only when legal — this is why input feels responsive; don't apply input directly to `dir`.

## Conventions

- **Style:** 2-space indent, single quotes, semicolons, and **spaces inside parentheses and array subscripts** (`if ( x )`, `grid[ y ][ x ]`, `( e ) =>`). Match the surrounding file exactly.
- **Language:** code comments and UI strings are Spanish. Comments are written without accents (ASCII) — keep it that way. UI text is Spanish too (`GANASTE`, `PERDISTE`, `VIDAS`), even though the HUD keeps `SCORE`.
- Each JS file starts with a 2-line header comment stating its responsibility and its global dependencies.

## Spec-driven workflow

The repo exists to practise spec-driven development (README). Skills live in `.agents/skills/` (`spec`, `spec-impl`), pinned by `skills-lock.json` — do not hand-edit those files, reinstalling overwrites them.

- Specs live in `specs/` as `NN-slug.md`; `spec-impl` reads branch config from `specs/.spec-config.yml`.
- Each spec has its own branch `spec-NN-slug` and its own PR.
- Specs are written in **Spanish** here (follow the language of existing specs).
- Each spec implementation step must be commitable on its own.