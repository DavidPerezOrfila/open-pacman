// e2e.playwright.js
// E2E en Chrome real sobre src/index.html con playwright-cli: overlay, Start,
// bucle de juego, teclado, dots, power pellet y comer fantasmas asustados.
//
// Necesita un servidor local (playwright-cli bloquea file://). Desde la raiz:
//   python -m http.server 8765 --bind 127.0.0.1
//   playwright-cli open --browser=chrome --headed
//   playwright-cli run-code --filename=tests/e2e.playwright.js
// --headed no es opcional si quieres ver la partida: sin el, playwright-cli
// corre Chrome en modo headless (ventana invisible).
// Sale con codigo != 0 si algun check falla. Cerrar con: playwright-cli close
//
// El script es un unico `async page => {}` porque run-code lo envuelve en (...).
// Los `let game` de main.js viven en el entorno lexico global, por eso
// page.evaluate puede leer game.score, game.lives, etc. sin nuevos globals.

async page => {
  const TEST_URL = 'http://127.0.0.1:8765/src/index.html';
  const results = [];
  const check = ( name, ok, detail ) => results.push( { name, ok: !!ok, detail: detail || '' } );

  const errors = [];
  const urlOf = ( m ) => ( m.location && m.location().url ) || '';
  page.on( 'pageerror', ( e ) => errors.push( 'pageerror: ' + e ) );
  page.on( 'console', ( m ) => {
    // El 404 de favicon.ico no existe en el repo y no afecta al juego.
    if ( m.type() !== 'error' || urlOf( m ).endsWith( 'favicon.ico' ) ) return;
    errors.push( m.text() + ' @ ' + urlOf( m ) );
  } );

  await page.goto( TEST_URL );
  // Traer la ventana al frente: Chrome congela requestAnimationFrame si la
  // ventana esta minimizada u oculta y el bucle del juego no avanza.
  await page.bringToFront();
  await page.waitForFunction( () => typeof game === 'object' );

  const overlay = page.locator( '#overlay' );
  check( 'overlay inicial visible', await overlay.evaluate( ( el ) => el.classList.contains( 'show' ) ) );
  check( 'titulo PAC-MAN', ( await overlay.locator( 'h1' ).textContent() ) === 'PAC-MAN' );

  const fresh = await page.evaluate( () => ( {
    state: game.state, score: game.score, lives: game.lives, dots: game.dotsRemaining,
  } ) );
  check( 'estado inicial start', fresh.state === 'start', fresh.state );
  check( 'HUD inicial score=0 vidas=3', fresh.score === 0 && fresh.lives === 3, JSON.stringify( fresh ) );

  await page.getByRole( 'button', { name: 'Start' } ).click();
  await page.waitForTimeout( 100 );
  check( 'overlay oculta al iniciar', !( await overlay.evaluate( ( el ) => el.classList.contains( 'show' ) ) ) );

  const init = await page.evaluate( () => ( {
    state: game.state, score: game.score, lives: game.lives, dots: game.dotsRemaining,
    x: game.pacman.x, ghosts: game.ghosts.length,
  } ) );
  check( 'estado playing', init.state === 'playing', init.state );
  // El bucle ya corre, asi que se toleran los dots comidos en los primeros frames.
  check( 'partida nueva con el laberinto lleno', init.dots >= fresh.dots - 5, init.dots + '/' + fresh.dots );
  check( '4 fantasmas', init.ghosts === 4, String( init.ghosts ) );

  await page.keyboard.press( 'ArrowLeft' );
  // Esperas por estado del juego, no por reloj: cada tramo dura lo que tarde
  // el bucle en recorrerlo, caiga lo que caiga el numero de fps.
  let avanzado = true;
  try {
    await page.waitForFunction( () => game.pacman.x <= 6 && game.score > 0, null, { timeout: 15000 } );
  } catch ( e ) { avanzado = false; }
  const after = await page.evaluate( () => ( {
    x: game.pacman.x, dir: game.pacman.dir, score: game.score, dots: game.dotsRemaining,
  } ) );
  check( 'Pac-Man avanza a la izquierda', avanzado && after.dir === 'left', init.x + ' -> ' + after.x );
  check( 'come dots y suma SCORE', avanzado && after.score > 0 && after.dots < init.dots, 'score=' + after.score + ' dots=' + after.dots );

  // Ruta a la power pellet de (1,23): arriba hasta la fila 20, izquierda hasta
  // la columna 1 y abajo. La pared de las columnas 4-5 impide ir en recto.
  await page.keyboard.press( 'ArrowUp' );
  let girado = true;
  try {
    await page.waitForFunction( () => game.pacman.dir === 'up', null, { timeout: 10000 } );
    await page.waitForFunction( () => game.pacman.y <= 20, null, { timeout: 15000 } );
  } catch ( e ) { girado = false; }
  check( 'aplica el giro encolado (nextDir)', girado );

  await page.keyboard.press( 'ArrowLeft' );
  try {
    await page.waitForFunction( () => game.pacman.x <= 1, null, { timeout: 15000 } );
  } catch ( e ) { girado = false; }
  await page.keyboard.press( 'ArrowDown' );

  let pellet = true;
  try {
    await page.waitForFunction( () => game.frightenedTimer > 0, null, { timeout: 15000 } );
  } catch ( e ) { pellet = false; }
  const scared = await page.evaluate( () => ( {
    timer: game.frightenedTimer,
    edible: game.ghosts.every( ( g ) => ghostEdible( game, g ) ),
  } ) );
  check( 'la power pellet activa frightened', pellet && scared.timer > 0, JSON.stringify( scared ) );
  check( 'los 4 fantasmas son comestibles', scared.edible );

  // Fantasma en la celda de Pac-Man: debe comerselo y volver al corral.
  const antes = await page.evaluate( () => {
    const g = game.ghosts[ 0 ];
    g.x = game.pacman.x;
    g.y = game.pacman.y;
    return game.score;
  } );
  let comidoFantasma = true;
  try {
    await page.waitForFunction( () => game.ghosts[ 0 ].eaten === true, null, { timeout: 5000 } );
  } catch ( e ) { comidoFantasma = false; }
  const eaten = await page.evaluate( () => ( {
    score: game.score,
    x: game.ghosts[ 0 ].x,
    y: game.ghosts[ 0 ].y,
    eaten: game.ghosts[ 0 ].eaten,
    edible: ghostEdible( game, game.ghosts[ 0 ] ),
    start: { x: GHOST_STARTS[ 0 ].x, y: GHOST_STARTS[ 0 ].y },
  } ) );
  check( 'comer fantasma suma al menos 200', comidoFantasma && eaten.score - antes >= 200, ( eaten.score - antes ) + ' pts' );
  check( 'el fantasma comido vuelve al corral', eaten.x === eaten.start.x && eaten.y === eaten.start.y, 'x=' + eaten.x + ' y=' + eaten.y );
  check( 'el fantasma comido deja de ser comestible', eaten.eaten === true && eaten.edible === false );

  // Fin del modo y fantasma normal encima: debe restar vida.
  const vidas = await page.evaluate( () => {
    game.frightenedTimer = 0;
    game.ghosts[ 1 ].eaten = false;
    game.ghosts[ 1 ].x = game.pacman.x;
    game.ghosts[ 1 ].y = game.pacman.y;
    return game.lives;
  } );
  let lifeLost = true;
  try {
    await page.waitForFunction( ( v ) => game.lives < v, vidas, { timeout: 10000 } );
  } catch ( e ) { lifeLost = false; }
  const mid = await page.evaluate( () => ( { lives: game.lives, state: game.state } ) );
  check( 'colision con fantasma normal resta vida', lifeLost, JSON.stringify( mid ) );

  check( 'consola sin errores', errors.length === 0, errors.join( ' | ' ) );

  const failed = results.filter( ( r ) => !r.ok );
  if ( failed.length ) {
    throw new Error(
      'E2E FAIL ' + ( results.length - failed.length ) + '/' + results.length + ': ' +
      failed.map( ( r ) => r.name + ( r.detail ? ' (' + r.detail + ')' : '' ) ).join( ', ' )
    );
  }
  return { summary: 'E2E PASS ' + results.length + '/' + results.length, results };
}
